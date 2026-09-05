from aws_cdk import Stack, RemovalPolicy, Duration
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_cloudfront as cloudfront
from aws_cdk import aws_cloudfront_origins as origins
from aws_cdk import aws_lambda as lambda_
from aws_cdk import aws_apigatewayv2 as apigwv2
from aws_cdk import aws_apigatewayv2_integrations as apigwv2_integrations
from aws_cdk import aws_iam as iam
from constructs import Construct


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

        self.distribution = cloudfront.Distribution(
            self,
            "Distribution",
            default_root_object="index.html",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_control(
                    self.frontend_bucket
                ),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            ),
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.seconds(0),
                ),
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.seconds(0),
                ),
            ],
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
                resources=["*"],
            )
        )
        github_deploy_role.add_to_policy(
            iam.PolicyStatement(
                actions=[
                    "cloudformation:*",
                    "lambda:*",
                    "apigateway:*",
                    "events:*",
                    "iam:*",
                    "ssm:GetParameter*",
                    "s3:*",
                    "cloudfront:*",
                ],
                resources=["*"],
            )
        )

        from aws_cdk import CfnOutput

        CfnOutput(self, "GithubDeployRoleArn", value=github_deploy_role.role_arn)
        CfnOutput(self, "FrontendBucketName", value=self.frontend_bucket.bucket_name)
        CfnOutput(self, "DistributionId", value=self.distribution.distribution_id)
