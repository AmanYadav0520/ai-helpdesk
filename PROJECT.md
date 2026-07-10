# AI-Powered Ticket Management System

## Problem

We receive hundreds of support emails daily. Our agents manually read, classify, and respond to each ticket — which is slow and leads to impersonal, canned responses.

## Solution

Build a ticket management system that uses AI to automatically classify, respond to, and route support tickets — delivering faster, more personalized responses to customers while freeing up agents for complex issues.

## Features

- Receive support emails and create tickets
- Auto-generate human-friendly responses using a knowledge base
- Ticket list with filtering and sorting
- Ticket detail view
- AI-powered ticket classification
- AI summaries
- AI-suggested replies
- User management (admin only)
- Dashboard to view and manage all tickets

## Ticket Statuses

- Open
- Resolved
- Closed

## Categories

Each ticket belongs to exactly one category:

- General
- Technical Question
- Refund Request

## Roles & Access

- System is deployed with a single admin account
- Admin can create additional agent accounts
- (Open question: what can agents do that admins can't, and vice versa? See Open Questions below.)

## Routing

- No team/agent-specific routing — all tickets land in a single shared queue, filtered by category/status
- Any agent can pick up any ticket

## Knowledge Base

- Built and maintained in-app (not imported from an external help center/doc source)
- (Open question: who authors articles — admin only, or agents too?)

## Open Questions

- **AI reply flow**: does the AI send replies automatically, or does an agent always review/approve first? Does this vary by category or confidence level?
- **Low-confidence handling**: what happens when the AI can't confidently classify or draft a reply — escalate to a human, flag, or fall back to "General"?
- **Email ingestion**: how do inbound emails become tickets (forwarding address, IMAP poll, webhook)? Are attachments supported?
- **Threading**: can a ticket have multiple back-and-forth messages, or is it always one email = one ticket?
- **Priority/SLA**: is there any urgency/priority field, or is status (open/resolved/closed) the only tracking dimension?
- **Agent permissions**: can agents edit the knowledge base, reassign tickets, or only work tickets in the shared queue?
- **Tech stack**: not yet specified.