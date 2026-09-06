# DonorTrack infrastructure

AWS CDK (Python) stack that provisions everything DonorTrack runs on. One stack, `DonortrackStack`, defined in [infra/infra_stack.py](./infra/infra_stack.py).

## What it provisions

- **S3 bucket** (private, OAC-only access) holding the built frontend
- **CloudFront distribution** — default behavior serves the frontend from S3 (with a CloudFront Function for SPA routing); `/api/*` routes to API Gateway
- **API Gateway (HTTP API)** in front of a Lambda function
- **Lambda** — the Express backend, packaged as a container image (not a zip; see the comment in `backend/Dockerfile` for why)
- **SSM Parameter Store** — the Lambda reads its secrets (JWT secret, database URL, and optionally a Resend API key / Sentry DSN) from SSM at cold start; CDK only grants read access to the parameter *names*, it never sees the values
- **IAM role for GitHub Actions**, assumable via OIDC (no stored AWS credentials)

Cost: every service here is either AWS's Always Free tier (Lambda, ECR under 500MB, SSM standard parameters) or its 12-month free tier (S3, CloudFront, API Gateway) at this project's traffic level — see the design spec for the full breakdown.

## One-time manual setup

CDK can't automate everything — a few things need to happen by hand, in order, before the stack is fully live:

1. **Bootstrap the account/region** (once per AWS account+region, skip if already done): `cdk bootstrap`
2. **First deploy**: `cdk deploy --require-approval never` (needs Docker running locally — the Lambda is a container image). Note the `GithubDeployRoleArn`, `FrontendBucketName`, and `DistributionId` outputs.
3. **Set GitHub Actions repo variables** (Settings → Secrets and variables → Actions → Variables) from those outputs: `AWS_DEPLOY_ROLE_ARN`, `FRONTEND_BUCKET_NAME`, `CLOUDFRONT_DISTRIBUTION_ID`.
4. **Populate SSM secrets**:
   ```bash
   aws ssm put-parameter --name "/donortrack/jwt-secret" --type SecureString --value "<32+ random chars>"
   aws ssm put-parameter --name "/donortrack/database-url" --type SecureString --value "<Neon pooled connection string>"
   ```
   `/donortrack/resend-api-key` and `/donortrack/sentry-dsn` are intentionally left unpopulated — email sending and error reporting are optional and no-op gracefully without them (see `loadSecrets.ts` and `utils/email.ts`). Populate them the same way if either comes back into use.
5. **ACM certificate for the custom domain**: this account's DNS lives in Cloudflare, not Route53, so CDK can't automate certificate validation the usual way. Request one manually (`aws acm request-certificate --region us-east-1 --domain-name donortrackapp.com --subject-alternative-names www.donortrackapp.com --validation-method DNS`), add the DNS validation CNAME records it returns to Cloudflare, wait for `ISSUED`, then reference its ARN via `acm.Certificate.from_certificate_arn(...)` in the stack (already done — update the ARN in `infra_stack.py` if the certificate is ever recreated).
6. **DNS**: point `donortrackapp.com` and `www.donortrackapp.com` at the CloudFront distribution's domain (CNAME, "DNS only"/unproxied in Cloudflare, to avoid double-proxying two CDNs).

## Day-to-day deploys

Once the above is done, deploys are automatic via GitHub Actions:

- `.github/workflows/deploy-frontend.yml` — triggers on `frontend/**` changes to `main`; builds and syncs to S3, invalidates CloudFront.
- `.github/workflows/deploy-infra.yml` — triggers on `backend/**` or `infra/**` changes to `main`; runs backend tests, applies the Prisma schema (`prisma db push` — this repo has no migration history, see the schema-push note below), runs infra tests, then `cdk deploy`.

Both assume the `AWS_DEPLOY_ROLE_ARN` role via OIDC — no AWS credentials are stored as GitHub secrets.

### Why `prisma db push`, not `prisma migrate deploy`

This repo has never had a `prisma/migrations/` directory. `migrate deploy` against a project with no migration history doesn't error, it just silently does nothing ("No pending migrations to apply") — which looks like success while leaving the database schema untouched. `db push` is the right tool here since it diffs the live schema directly.

## Useful commands

- `cdk synth` — emit the synthesized CloudFormation template
- `cdk diff` — compare the deployed stack with the current code
- `cdk deploy --require-approval never` — deploy (needs Docker running locally)
- `pytest` — run the unit tests against the synthesized template (works without Docker: `aws:cdk:bundling-stacks` is set to skip asset bundling in tests, see `tests/unit/test_infra_stack.py`)
