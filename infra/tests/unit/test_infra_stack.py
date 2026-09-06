import aws_cdk as cdk
from aws_cdk.assertions import Template, Match

from infra.infra_stack import DonortrackStack


def _synth_stack() -> Template:
    # The stack's api_lambda is a DockerImageFunction, which needs Docker
    # available to actually build the image as part of asset bundling —
    # true at real deploy time, but not something a unit test should
    # require. `aws:cdk:bundling-stacks` set to an empty list is CDK's
    # documented escape hatch: it skips asset bundling entirely (Docker
    # image build included) for every stack, replacing bundled output with
    # a placeholder, so `Template.from_stack()` works the same on a machine
    # with no Docker installed as one with it.
    app = cdk.App(context={"aws:cdk:bundling-stacks": []})
    stack = DonortrackStack(app, "TestStack")
    return Template.from_stack(stack)


def test_stack_synthesizes():
    template = _synth_stack()
    assert template is not None


def test_frontend_bucket_blocks_public_access():
    template = _synth_stack()
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
    template = _synth_stack()
    template.resource_count_is("AWS::CloudFront::Distribution", 1)


def test_api_lambda_is_a_container_image_function():
    # DockerImageFunction (chosen so Prisma's client — which bundles WASM
    # query compilers for every database it supports, regardless of
    # binaryTargets — doesn't blow past the 250MB zip-package limit)
    # synthesizes with PackageType "Image" and no Runtime/Handler properties
    # at all, since those are baked into the image via the Dockerfile's CMD.
    template = _synth_stack()
    template.has_resource_properties(
        "AWS::Lambda::Function",
        {"PackageType": "Image"},
    )


def test_ssm_parameters_granted_to_lambda_role():
    template = _synth_stack()
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


def test_no_stripe_secrets_granted():
    # Regression guard for the Stripe/paywall removal: the Lambda's IAM
    # policy should reference exactly the 4 remaining secrets, never the
    # old Stripe ones, even if someone re-adds them to secret_param_names
    # without noticing Stripe is gone.
    template = _synth_stack()
    assert "stripe" not in str(template.to_json()).lower()


def test_no_eventbridge_rule():
    # Regression guard: the cron Lambda + EventBridge rule (built for the
    # now-removed trial-reminder emails) must not come back silently.
    template = _synth_stack()
    template.resource_count_is("AWS::Events::Rule", 0)


def test_spa_routing_is_scoped_to_the_default_behavior_only():
    # Regression guard: SPA routing used to be a distribution-level
    # `error_responses` rewrite, which CloudFormation applies to *every*
    # behavior, not just the frontend one — silently turning every 403/404
    # from the /api/* behavior into a 200 HTML response. It's now a
    # CloudFront Function on the default behavior only, and the
    # distribution has no CustomErrorResponses at all.
    template = _synth_stack()
    template.has_resource_properties(
        "AWS::CloudFront::Distribution",
        {
            "DistributionConfig": Match.object_like(
                {
                    "DefaultCacheBehavior": Match.object_like(
                        {
                            "FunctionAssociations": Match.array_with(
                                [
                                    Match.object_like(
                                        {"EventType": "viewer-request"}
                                    )
                                ]
                            )
                        }
                    ),
                    "CustomErrorResponses": Match.absent(),
                }
            )
        },
    )


def test_github_oidc_role_exists():
    template = _synth_stack()
    template.has_resource_properties(
        "AWS::IAM::Role",
        {
            "AssumeRolePolicyDocument": {
                "Statement": Match.array_with(
                    [
                        Match.object_like(
                            {
                                "Action": "sts:AssumeRoleWithWebIdentity",
                            }
                        )
                    ]
                )
            }
        },
    )
