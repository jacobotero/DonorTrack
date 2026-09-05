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
            "/donortrack/stripe-secret-key",
            "/donortrack/stripe-webhook-secret",
            "/donortrack/resend-api-key",
            "/donortrack/sentry-dsn",
        ]

        self.api_lambda = lambda_.Function(
            self,
            "ApiFunction",
            runtime=lambda_.Runtime.NODEJS_22_X,
            handler="lambda.handler",
            code=lambda_.Code.from_asset("../backend/dist-lambda"),
            timeout=Duration.seconds(28),
            memory_size=512,
            environment={
                "NODE_ENV": "production",
                "PORT": "3000",
                "JWT_EXPIRES_IN": "7d",
                "FRONTEND_URL": "https://www.donortrackapp.com",
                "DATABASE_URL_PARAM": "/donortrack/database-url",
                "JWT_SECRET_PARAM": "/donortrack/jwt-secret",
                "STRIPE_SECRET_KEY_PARAM": "/donortrack/stripe-secret-key",
                "STRIPE_WEBHOOK_SECRET_PARAM": "/donortrack/stripe-webhook-secret",
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
