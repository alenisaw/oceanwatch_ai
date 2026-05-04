# Deployment

Deployment files are templates. They are not wired into CI by default.

Recommended order:

```text
1. Keep local CI green.
2. Build the CPU Docker image.
3. Configure Supabase secrets.
4. Deploy the API to DigitalOcean.
5. Add GPU/ROCm deployment separately.
```
