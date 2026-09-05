import aws_cdk as cdk
from aws_cdk.assertions import Template

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
