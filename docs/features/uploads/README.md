# Uploads

## Purpose

Fitur uploads membuat signed URL untuk upload bukti foto ke Cloudflare R2.

## Main Entry Points

- API presign: `src/app/api/uploads/presign/route.ts`
- Validation schema: `presignSchema` in `src/lib/validations.ts`
- Expense UI consumes returned URL through expense form flow.

## Data Model Ownership

- No database model owned directly.
- Expense stores resulting `photoUrl`.

## Business Rules

- Only image MIME types are accepted.
- Bucket and public URL are configured by environment variables.
- Upload endpoint should be authenticated before public production use.

## Environment Variables

```env
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_URL=""
```

## Extension Checklist

- Move upload logic into `src/features/uploads/application`.
- Add file size validation at edge/server.
- Add lifecycle rules in R2 for old proof images.
