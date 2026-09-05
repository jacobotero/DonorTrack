import aws_cdk as cdk
from aws_cdk.assertions import Template, Match

from infra.infra_stack import DonortrackStack


def test_stack_synthesizes():
    app = cdk.App()
    stack = DonortrackStack(app, "TestStack")
    template = Template.from_stack(stack)
    assert template is not None


def test_frontend_bucket_blocks_public_access():
    app = cdk.App()
    stack = DonortrackStack(app, "TestStack")
    template = Template.from_stack(stack)
    template.has_resource_properties(
        "AWS::S3::Bucket",
        {
            "PublicAccessBlockConfiguration": {
                "BlockPublicAcls": True,
                "BlockPublicPolicy": True,
                "IgnorePublicAcls": True,
                "RestrictPublicBuckets": True,
            }
        },
    )


def test_cloudfront_distribution_exists():
    app = cdk.App()
    stack = DonortrackStack(app, "TestStack")
    template = Template.from_stack(stack)
    template.resource_count_is("AWS::CloudFront::Distribution", 1)


def test_api_lambda_uses_node_22_runtime():
    app = cdk.App()
    stack = DonortrackStack(app, "TestStack")
    template = Template.from_stack(stack)
    template.has_resource_properties(
        "AWS::Lambda::Function",
        {"Runtime": "nodejs22.x", "Handler": "lambda.handler"},
    )


def test_ssm_parameters_granted_to_lambda_role():
    app = cdk.App()
    stack = DonortrackStack(app, "TestStack")
    template = Template.from_stack(stack)
    template.has_resource_properties(
        "AWS::IAM::Policy",
        {
            "PolicyDocument": {
                "Statement": Match.array_with(
                    [
                        Match.object_like(
                            {
                                "Action": "ssm:GetParameter",
                            }
                        )
                    ]
                )
            }
        },
    )


def test_cron_rule_runs_daily_at_9am_utc():
    app = cdk.App()
    stack = DonortrackStack(app, "TestStack")
    template = Template.from_stack(stack)
    template.has_resource_properties(
        "AWS::Events::Rule",
        {"ScheduleExpression": "cron(0 9 * * ? *)"},
    )
