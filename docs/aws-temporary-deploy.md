# AWS Temporary Deployment

This document records an earlier temporary hosting plan that was considered before the SkyServer VPS became available.

It is kept for historical context only. The active first deployment target is now the SkyServer VPS.

## Why AWS Now

The originally chosen low-cost VPS did not provision successfully on time. Rather than wait through an uncertain weekend, the project will use AWS as a temporary landing zone so CI/CD and first deployment can be finished immediately.

## Temporary Target

Use one Ubuntu-based EC2 instance with:

- `k3s`
- Docker for local image builds if needed
- ports `80` and `443` open publicly
- SSH restricted to the maintainer IP when possible

The DNS records would point to the instance for:

- `photon.abhinash.dev`
- `storage.photon.abhinash.dev`
- `minio.photon.abhinash.dev`
- `grafana.photon.abhinash.dev`

## Cost Model Reminder

AWS is not free when the instance is stopped:

- EC2 compute charges stop when the instance is in the `stopped` state
- EBS volume charges continue
- public IPv4 charges continue while the address is allocated

That makes AWS a good temporary target, but not the cheapest long-term home.

## Exit Path

If SkyServer eventually provisions correctly and is stable enough, the move should be:

1. bring up `k3s` on the SkyServer VPS
2. point the same GitHub Actions deployment flow at the new target
3. deploy the same manifests and images
4. verify the four public hostnames on the new server
5. switch DNS records in the active DNS manager
6. remove the AWS instance later

Because Photon is currently an ephemeral-data demo, this move does not require preserving old jobs or old object storage contents.
