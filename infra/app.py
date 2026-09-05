#!/usr/bin/env python3
import aws_cdk as cdk

from infra.infra_stack import DonortrackStack

app = cdk.App()
DonortrackStack(
    app,
    "DonortrackStack",
    env=cdk.Environment(
        account=app.node.try_get_context("account"),
        region="us-east-1",  # CloudFront's ACM cert must be us-east-1
    ),
)
app.synth()
