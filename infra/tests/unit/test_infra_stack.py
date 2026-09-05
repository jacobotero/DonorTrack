import aws_cdk as cdk
from aws_cdk.assertions import Template

from infra.infra_stack import DonortrackStack


def test_stack_synthesizes():
    app = cdk.App()
    stack = DonortrackStack(app, "TestStack")
    template = Template.from_stack(stack)
    assert template is not None
