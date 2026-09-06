from aws_cdk import Stack, RemovalPolicy, Duration
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_cloudfront as cloudfront
from aws_cdk import aws_cloudfront_origins as origins
from aws_cdk import aws_lambda as lambda_
from aws_cdk import aws_apigatewayv2 as apigwv2
from aws_cdk import aws_apigatewayv2_integrations as apigwv2_integrations
from aws_cdk import aws_iam as iam
from aws_cdk import aws_certificatemanager as acm
from aws_cdk import aws_ses as ses
from constructs import Construct

# The contact/support forms send through SES rather than Resend (which has
# no API key configured). Sender and recipient are the same verified
# identity, so this works even while the SES account is in sandbox mode
# (which only allows sending between verified identities) with no domain
# verification or production-access request needed.
CONTACT_EMAIL = "donortrackapp@gmail.com"


class DonortrackStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.frontend_bucket = s3.Bucket(
            self,
            "FrontendBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )

        # DNS lives in Cloudflare, not Route53, so this references a
        # certificate requested and DNS-validated manually (see the runbook
        # in Task 14) rather than using CDK's Route53-integrated
        # `acm.Certificate` construct, which assumes CDK owns the zone.
        site_certificate = acm.Certificate.from_certificate_arn(
            self,
            "SiteCertificate",
            "arn:aws:acm:us-east-1:699575759727:certificate/a0b7e5f5-7d21-49cc-b35d-199cee2dc840",
        )

        # SPA routing (rewrite any extensionless path to /index.html so
        # React Router can handle it client-side) used to be done via
        # `error_responses` on the whole Distribution — but that property is
        # distribution-wide in CloudFormation, not scoped to this behavior,
        # so it was also rewriting every 403/404 from the /api/* behavior
        # into a 200 HTML response. That corrupted every real "not found"
        # error the API returned (e.g. a deleted donor) into an
        # unparseable-as-JSON 200. A CloudFront Function attached only to
        # this default behavior does the same rewrite without touching the
        # API behavior at all.
        spa_router = cloudfront.Function(
            self,
            "SpaRouterFunction",
            code=cloudfront.FunctionCode.from_inline(
                "function handler(event) {\n"
                "  var request = event.request;\n"
                "  if (!request.uri.includes('.')) {\n"
                "    request.uri = '/index.html';\n"
                "  }\n"
                "  return request;\n"
                "}"
            ),
        )

        self.distribution = cloudfront.Distribution(
            self,
            "Distribution",
            domain_names=["donortrackapp.com", "www.donortrackapp.com"],
            certificate=site_certificate,
            default_root_object="index.html",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(
                    self.frontend_bucket
                ),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                function_associations=[
                    cloudfront.FunctionAssociation(
                        function=spa_router,
                        event_type=cloudfront.FunctionEventType.VIEWER_REQUEST,
                    )
                ],
            ),
        )

        # Secrets, referenced by name at deploy time — the actual values are
        # populated once, manually, via `aws ssm put-parameter` (see the
        # runbook in Task 13). CDK only needs to know the names exist so it
        # can grant the Lambda read access; it never sees the values.
        secret_param_names = [
            "/donortrack/database-url",
            "/donortrack/jwt-secret",
            "/donortrack/resend-api-key",
            "/donortrack/sentry-dsn",
        ]

        # Container-image Lambda rather than a zip package — see
        # backend/Dockerfile for why (Prisma's client bundles WASM query
        # compilers for every database it supports, pushing a plain zip well
        # past Lambda's 250MB unzipped limit regardless of build tricks).
        # CDK builds the image from backend/Dockerfile and pushes it to the
        # account's CDK asset ECR repository automatically as part of
        # `cdk deploy` — no manual Docker/ECR setup needed.
        self.api_lambda = lambda_.DockerImageFunction(
            self,
            "ApiFunction",
            code=lambda_.DockerImageCode.from_image_asset("../backend"),
            timeout=Duration.seconds(28),
            memory_size=512,
            environment={
                "NODE_ENV": "production",
                "PORT": "3000",
                "JWT_EXPIRES_IN": "7d",
                "FRONTEND_URL": "https://www.donortrackapp.com",
                # Not a secret (just an email address) so it's a plain env
                # var here rather than an SSM parameter. Must exactly match
                # the (lowercased) email of the DonorTrack account used to
                # log into /admin.
                "ADMIN_EMAIL": "jacobotero0313@gmail.com",
                "DATABASE_URL_PARAM": "/donortrack/database-url",
                "JWT_SECRET_PARAM": "/donortrack/jwt-secret",
                "RESEND_API_KEY_PARAM": "/donortrack/resend-api-key",
                "SENTRY_DSN_PARAM": "/donortrack/sentry-dsn",
            },
        )

        # Granting `ssm:GetParameter` directly by constructed ARN, rather than
        # via `StringParameter.from_secure_string_parameter_attributes` (which
        # in some CDK versions requires pinning a `version` number just to
        # grant read access, not only to resolve the value at synth time) —
        # this way needs no version and works purely from the parameter name.
        self.api_lambda.add_to_role_policy(
            iam.PolicyStatement(
                actions=["ssm:GetParameter"],
                resources=[
                    f"arn:aws:ssm:{self.region}:{self.account}:parameter{name}"
                    for name in secret_param_names
                ],
            )
        )

        # Verifies donortrackapp@gmail.com as an SES sending identity. CDK
        # creates the identity, but AWS itself emails a confirmation link to
        # that inbox that a human has to click — this can't be automated,
        # same as the ACM certificate's DNS validation above.
        ses.EmailIdentity(
            self,
            "ContactEmailIdentity",
            identity=ses.Identity.email(CONTACT_EMAIL),
        )
        self.api_lambda.add_to_role_policy(
            iam.PolicyStatement(
                actions=["ses:SendEmail", "ses:SendRawEmail"],
                resources=[
                    f"arn:aws:ses:{self.region}:{self.account}:identity/{CONTACT_EMAIL}"
                ],
            )
        )

        http_api = apigwv2.HttpApi(
            self,
            "HttpApi",
            default_integration=apigwv2_integrations.HttpLambdaIntegration(
                "ApiIntegration", self.api_lambda
            ),
        )

        self.distribution.add_behavior(
            "/api/*",
            origins.HttpOrigin(
                f"{http_api.http_api_id}.execute-api.{self.region}.amazonaws.com"
            ),
            viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
            cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
            origin_request_policy=cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        )

        # Referencing the existing provider rather than constructing a new
        # one: AWS IAM allows only one OIDC provider per URL per account,
        # and this account already has one (created by the portfolio site's
        # own separate CDK stack) — a fresh `iam.OpenIdConnectProvider(...)`
        # would fail at real `cdk deploy` time with AlreadyExists, even
        # though it passes `cdk synth`/pytest fine since those never touch
        # real AWS.
        github_oidc_provider = iam.OpenIdConnectProvider.from_open_id_connect_provider_arn(
            self,
            "GithubOidcProvider",
            f"arn:aws:iam::{self.account}:oidc-provider/token.actions.githubusercontent.com",
        )

        # Replace "jacobotero/DonorTrack" if the repo is ever renamed/moved.
        github_deploy_role = iam.Role(
            self,
            "GithubDeployRole",
            assumed_by=iam.WebIdentityPrincipal(
                github_oidc_provider.open_id_connect_provider_arn,
                conditions={
                    "StringEquals": {
                        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                    },
                    "StringLike": {
                        "token.actions.githubusercontent.com:sub": "repo:jacobotero/DonorTrack:*"
                    },
                },
            ),
        )

        self.frontend_bucket.grant_read_write(github_deploy_role)
        github_deploy_role.add_to_policy(
            iam.PolicyStatement(
                actions=["cloudfront:CreateInvalidation"],
                resources=[
                    f"arn:aws:cloudfront::{self.account}:distribution/{self.distribution.distribution_id}"
                ],
            )
        )
        # This role only ever needs to read *this stack's* secrets, so unlike
        # the broad grant below, scoping it costs nothing and closes a real
        # gap: an unscoped `ssm:GetParameter*` would let CI read every
        # parameter in the account, including the portfolio site's.
        github_deploy_role.add_to_policy(
            iam.PolicyStatement(
                actions=["ssm:GetParameter*"],
                resources=[
                    f"arn:aws:ssm:{self.region}:{self.account}:parameter{name}"
                    for name in secret_param_names
                ],
            )
        )
        # `cloudformation:*`/`lambda:*`/`apigateway:*`/`events:*`/`iam:*`/`s3:*`/
        # `cloudfront:*` on resources:["*"] is intentionally broad — `cdk deploy`
        # needs to create and modify whatever this stack's resources are, and
        # that set changes as the stack grows, so pinning it to today's
        # resource ARNs would silently break the next `cdk deploy` that adds
        # something new. `iam:*` in particular is privilege-escalation-capable
        # (e.g. this role could attach a policy to itself or mint new IAM
        # users), so this trade is safe only because the trust policy above
        # restricts *who* can assume the role to this one GitHub repo's
        # Actions runs — not because the actions themselves are narrow.
        github_deploy_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    "cloudformation:*",
                    "lambda:*",
                    "apigateway:*",
                    "events:*",
                    "iam:*",
                    "s3:*",
                    "cloudfront:*",
                ],
                resources=["*"],
            )
        )
        # CDK's normal deploy path assumes the bootstrap stack's own roles
        # (deploy/file-publishing/image-publishing/lookup/exec) rather than
        # acting directly as the calling identity — without permission to
        # assume them, CDK silently falls back to this role's own
        # credentials, and this role never had ecr:* to push the Lambda's
        # container image asset with. Granting AssumeRole on the bootstrap
        # roles is what actually makes `cdk deploy` push image/file assets;
        # the explicit ecr:* grant below is a defensive fallback in case
        # that assume-role path isn't used for some reason.
        github_deploy_role.add_to_policy(
            iam.PolicyStatement(
                actions=["sts:AssumeRole"],
                resources=[
                    f"arn:aws:iam::{self.account}:role/cdk-*-{self.account}-{self.region}"
                ],
            )
        )
        github_deploy_role.add_to_policy(
            iam.PolicyStatement(
                actions=["ecr:*"],
                resources=["*"],
            )
        )
        # CDK checks this parameter to confirm the target account/region is
        # bootstrapped before it will deploy at all — without read access to
        # it, `cdk deploy` fails immediately, before touching any of this
        # stack's own resources.
        github_deploy_role.add_to_policy(
            iam.PolicyStatement(
                actions=["ssm:GetParameter"],
                resources=[
                    f"arn:aws:ssm:{self.region}:{self.account}:parameter/cdk-bootstrap/*"
                ],
            )
        )

        from aws_cdk import CfnOutput

        CfnOutput(self, "GithubDeployRoleArn", value=github_deploy_role.role_arn)
        CfnOutput(self, "FrontendBucketName", value=self.frontend_bucket.bucket_name)
        CfnOutput(self, "DistributionId", value=self.distribution.distribution_id)
