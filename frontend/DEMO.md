# TrustVault - Evaluator Demo Guide

## Live Application

https://trust-vault-ashen.vercel.app

## Demo Accounts

### Evaluator Admin
- Email: `trustvault.evaluator.admin@gmail.com`
- Role: `ADMIN`
- Purpose: Demonstrates document management, sharing, permissions, and administrative features.

### Evaluator Viewer
- Email: `trustvault.evaluator.viewer@gmail.com`
- Role: `VIEWER`
- Purpose: Demonstrates controlled access to documents shared by another user.

> Passwords are provided separately through the hackathon evaluation/submission process and are intentionally not stored in this public repository.

## Recommended Demo Flow

1. Sign in as the Evaluator Admin.
2. Upload a document.
3. Open the document list and verify the uploaded document.
4. Edit the document metadata.
5. Share the document with the Evaluator Viewer using `READ` permission.
6. Sign in as the Evaluator Viewer and verify access to the shared document.
7. Return to the Evaluator Admin account.
8. Revoke the Viewer's permission.
9. Sign in as the Viewer again and verify that access is no longer available.
10. Open the Admin Dashboard to review security/audit activity.

## Security Features

TrustVault implements:

- Multi-tenant data isolation
- Role-based access control
- Document ownership checks
- Document-level permissions
- Row Level Security (RLS)
- Protected security-definer database functions
- Audit logging for security-sensitive operations
- Private document storage
- Controlled document downloads
- Controlled document deletion
- Permission grant, update, and revoke auditing

## Repository

The source code and development history are available in the public GitHub repository.

## AI-Assisted Development

Major AI-assisted development decisions and iterations are documented in `PROMPTS.md`.