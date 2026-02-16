"""
OpenSnek — Multi-tenant university layer for DeepTutor.

This package adds authentication (Azure AD SSO), course management,
enrollment, professor dashboards, and activity tracking on top of
DeepTutor's AI tutoring features.

When the NEXTAUTH_SECRET environment variable is not set, this entire
package is inactive and DeepTutor runs in its original single-user mode.
"""
