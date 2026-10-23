# Estim AI Platform - User Guide

## 1. Welcome to Estim AI Platform

The Estim AI Platform helps construction professionals make data-driven decisions by combining ERP data with AI-powered insights. The platform is organized into seven business modules:

1. **Procurement Intelligence** - Fraud detection, price anomalies, duplicate invoice detection
2. **Cost Forecasting** - Budget overrun prediction, Estimate at Completion (EAC)
3. **Inventory Intelligence** - Demand forecasting, reorder point optimization
4. **Predictive Maintenance** - Equipment failure prediction, maintenance scheduling
5. **Project Risk Intelligence** - Schedule delay prediction, milestone risk assessment
6. **Visual Quality Inspection** - Computer vision for defect detection
7. **Document Intelligence** - RAG-powered search for contracts, drawings, specifications

## 2. Getting Started

### 2.1 Log In

1. Navigate to the platform URL
2. Enter your email and password
3. Click "Sign In"

If you don't have an account, contact your administrator.

### 2.2 Dashboard Overview

After logging in, you'll see the main dashboard with:

- **Quick Stats**: Key metrics at a glance
- **Recommended Actions**: Alerts and suggestions
- **Recent Activity**: Your recent actions
- **Calendar**: Upcoming deployments and events

## 3. Module Navigation

### 3.1 Using the Sidebar

The main navigation is on the left sidebar:

| Section | Description |
|---------|-------------|
| **Dashboard** | Overview of key metrics |
| **Procurement** | Invoices, suppliers, procurement insights |
| **Cost Forecasting** | Budgets, forecasts, EAC |
| **Inventory** | Stocks, items, reorder management |
| **Maintenance** | Equipment, work orders, maintenance schedules |
| **Project Risk** | Risks, mitigation plans, assessments |
| **Visual Inspection** | Inspections, defect detection |
| **Documents** | Document search, RAG interface |

### 3.2 Using the Top Bar

The top bar provides:

- User profile and settings
- Search (global)
- Notifications
- Help and documentation links
- Log out

## 4. Common Tasks

### 4.1 Viewing Documents

1. Navigate to **Documents**
2. Use search to find specific documents
3. Click on a document to view
4. Use the preview to read or annotate

### 4.2 Creating a Forecast

1. Navigate to **Cost Forecasting**
2. Click **Create Forecast**
3. Select project and parameters
4. Review and submit

### 4.3 Managing Inventory

1. Navigate to **Inventory**
2. View item list or search for specific items
3. Click item to see details
4. Create reorder orders when needed

### 4.4 Recording Maintenance Work

1. Navigate to **Maintenance**
2. Select equipment or create new work order
3. Add details (date, technician, notes)
4. Save

## 5. Notifications and Alerts

### 5.1 Alert Types

| Alert | Meaning | Action |
|-------|---------|--------|
| **Critical** | System issue requiring immediate attention | Follow alert runbook |
| **Warning** | Potential issue to monitor | Check related metrics |
| **Info** | General information | Review when convenient |

### 5.2 Managing Notifications

1. Click your profile icon
2. Select **Notifications**
3. Configure preferences for each alert type

## 6. Reporting

### 6.1 Creating Reports

1. Navigate to the module
2. Select parameters (date range, filters)
3. Click **Export** to generate report
4. Download in preferred format (PDF, Excel)

### 6.2 Scheduled Reports

Some reports can be scheduled:

1. Create report with parameters
2. Click **Schedule** next to Export
3. Set frequency and delivery method

## 7. Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't log in | Check credentials, reset password if needed |
| Missing data | Check date filters, refresh page |
| Slow performance | Check network, use filters to reduce data |
| Error message | Note the error code and contact support |

## 8. Getting Help

- **Help Center**: In-app help documentation
- **Support**: Contact via #estim-support Slack channel
- **Training**: Request training sessions through Platform Lead

## 9. Glossary

| Term | Definition |
|------|-------------|
| **EAC** | Estimate at Completion - predicted final cost |
| **Redis** | In-memory data structure store used for caching |
| **RAG** | Retrieval-Augmented Generation - AI search approach |
| **Reconciliation** | Checking invoice data against Odoo |

## 10. Security

- Your password is securely hashed
- Sessions timeout after 15 minutes of inactivity
- Two-factor authentication available (admins can request)
- Data is encrypted in transit (HTTPS) and at rest

## 11. Related Documentation

- [FAQ](01-faq.md)
- [Onboarding Guide](02-onboarding.md)
- [API Documentation](../../docs/api/)
