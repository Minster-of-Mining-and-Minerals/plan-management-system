--
-- PostgreSQL database dump
--

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: enum_external_assignments_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_external_assignments_role AS ENUM (
    'owner',
    'collaborator'
);

--
-- Name: enum_form_config_fields_field_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_form_config_fields_field_type AS ENUM (
    'TEXT',
    'TEXTAREA',
    'NUMBER',
    'EMAIL',
    'PHONE',
    'DATE',
    'DATETIME',
    'TIME',
    'SELECT',
    'MULTI_SELECT',
    'RADIO',
    'CHECKBOX',
    'BOOLEAN',
    'FILE',
    'IMAGE',
    'ATTACHMENT',
    'URL',
    'PASSWORD'
);

--
-- Name: enum_issues_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_issues_status AS ENUM (
    'submitted',
    'under_review',
    'accepted',
    'rejected',
    'resolved',
    'closed'
);

--
-- Name: enum_notification_templates_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_notification_templates_category AS ENUM (
    'plans',
    'assignments',
    'system',
    'logs',
    'issues',
    'documents'
);

--
-- Name: enum_notification_templates_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_notification_templates_priority AS ENUM (
    'low',
    'normal',
    'high'
);

--
-- Name: enum_notifications_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_notifications_category AS ENUM (
    'plans',
    'assignments',
    'system',
    'logs',
    'issues',
    'documents'
);

--
-- Name: enum_notifications_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_notifications_priority AS ENUM (
    'low',
    'normal',
    'high'
);

--
-- Name: enum_plan_amendment_actions_action_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_amendment_actions_action_type AS ENUM (
    'target_reallocation',
    'annual_target_revision',
    'budget_increase',
    'budget_reduction',
    'kpi_addition',
    'kpi_removal',
    'owner_transfer',
    'timeline_extension',
    'plan_correction',
    'custom'
);

--
-- Name: enum_plan_amendment_actions_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_amendment_actions_status AS ENUM (
    'pending',
    'applied',
    'failed',
    'cancelled'
);

--
-- Name: enum_plan_amendments_amendment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_amendments_amendment_type AS ENUM (
    'target_reallocation',
    'annual_target_revision',
    'budget_increase',
    'budget_reduction',
    'kpi_addition',
    'kpi_removal',
    'owner_transfer',
    'timeline_extension',
    'plan_correction',
    'custom'
);

--
-- Name: enum_plan_amendments_effective_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_amendments_effective_mode AS ENUM (
    'immediate',
    'next_period',
    'custom_date'
);

--
-- Name: enum_plan_amendments_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_amendments_status AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'rejected',
    'cancelled',
    'applied'
);

--
-- Name: enum_plan_node_action_logs_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_node_action_logs_status AS ENUM (
    'pending',
    'submitted',
    'approved',
    'rejected',
    'forwarded'
);

--
-- Name: enum_plan_nodes_achievement_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_nodes_achievement_mode AS ENUM (
    'period',
    'annual'
);

--
-- Name: enum_plan_nodes_annual_actual_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_nodes_annual_actual_status AS ENUM (
    'empty',
    'submitted',
    'approved',
    'validated',
    'rejected'
);

--
-- Name: enum_plan_nodes_assignment_sharing_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_nodes_assignment_sharing_mode AS ENUM (
    'exclusive',
    'shared'
);

--
-- Name: enum_plan_nodes_period_actual_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_nodes_period_actual_status AS ENUM (
    'empty',
    'submitted',
    'approved',
    'rejected',
    'validated'
);

--
-- Name: enum_plan_nodes_target_allocation_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_nodes_target_allocation_mode AS ENUM (
    'divisible',
    'lump'
);

--
-- Name: enum_plan_nodes_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_nodes_type AS ENUM (
    'strategic',
    'goal',
    'kpi',
    'task'
);

--
-- Name: enum_plan_nodes_weight_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_nodes_weight_mode AS ENUM (
    'number',
    'percentage',
    'frequency'
);

--
-- Name: enum_plan_rule_steps_node_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_rule_steps_node_type AS ENUM (
    'strategic',
    'goal',
    'kpi',
    'task'
);

--
-- Name: enum_plan_rule_steps_weight_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_rule_steps_weight_mode AS ENUM (
    'number',
    'percentage',
    'frequency'
);

--
-- Name: enum_plan_rules_performance_scoring_policy; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_rules_performance_scoring_policy AS ENUM (
    'CAP_100',
    'ALLOW_OVER_ACHIEVEMENT'
);

--
-- Name: enum_plan_rules_weight_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_rules_weight_mode AS ENUM (
    'number',
    'percentage',
    'frequency'
);

--
-- Name: enum_plan_sector_aggregation_publishes_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_sector_aggregation_publishes_status AS ENUM (
    'pending',
    'published',
    'rejected'
);

--
-- Name: enum_plan_versions_execution_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_versions_execution_status AS ENUM (
    'locked',
    'open',
    'completed'
);

--
-- Name: enum_plan_versions_period_subdivision_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_versions_period_subdivision_mode AS ENUM (
    'quarterly',
    'semi_annual',
    'custom',
    'monthly'
);

--
-- Name: enum_plan_versions_review_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_versions_review_status AS ENUM (
    'under_review',
    'corrections_unlocked',
    'review_completed'
);

--
-- Name: enum_plan_versions_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_versions_status AS ENUM (
    'draft',
    'active',
    'completed',
    'finalized',
    'locked'
);

--
-- Name: enum_plan_versions_version_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_plan_versions_version_kind AS ENUM (
    'master',
    'annual',
    'execution_period'
);

--
-- Name: enum_planning_configurations_breakdown_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_planning_configurations_breakdown_mode AS ENUM (
    'quarterly',
    'semi_annual',
    'custom',
    'monthly'
);

--
-- Name: enum_target_allocation_histories_change_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_target_allocation_histories_change_type AS ENUM (
    'reallocation'
);

--
-- Name: enum_target_reallocation_requests_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_target_reallocation_requests_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled',
    'applied'
);

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachments (
    attachment_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: branding_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branding_audit_logs (
    branding_audit_log_id uuid NOT NULL,
    branding_setting_id uuid NOT NULL,
    changed_by uuid NOT NULL,
    previous_values jsonb NOT NULL,
    new_values jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: branding_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branding_settings (
    branding_setting_id uuid NOT NULL,
    government_structure_id uuid,
    system_name_full character varying(255) NOT NULL,
    system_name_short character varying(50) NOT NULL,
    system_tagline character varying(255),
    logo_primary_path character varying(500),
    logo_secondary_path character varying(500),
    favicon_path character varying(500),
    primary_color character varying(7) NOT NULL,
    secondary_color character varying(7) NOT NULL,
    accent_color character varying(7) NOT NULL,
    success_color character varying(7) NOT NULL,
    warning_color character varying(7) NOT NULL,
    error_color character varying(7) NOT NULL,
    info_color character varying(7) NOT NULL,
    background_color character varying(7) NOT NULL,
    surface_color character varying(7) NOT NULL,
    sidebar_color character varying(7) NOT NULL,
    header_color character varying(7) NOT NULL,
    text_primary_color character varying(7) NOT NULL,
    text_secondary_color character varying(7) NOT NULL,
    border_color character varying(7) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sidebar_nav_hover_color character varying(7) DEFAULT '#F5E6C8'::character varying NOT NULL,
    sidebar_nav_active_color character varying(7) DEFAULT '#CA8A04'::character varying NOT NULL,
    sidebar_nav_active_text_color character varying(7) DEFAULT '#FFFFFF'::character varying NOT NULL,
    sidebar_subnav_active_color character varying(7) DEFAULT '#F5E6C8'::character varying NOT NULL,
    sidebar_subnav_active_text_color character varying(7) DEFAULT '#0C4A6E'::character varying NOT NULL,
    sidebar_header_text_color character varying(7) DEFAULT '#CA8A04'::character varying NOT NULL,
    toolbar_button_color character varying(7) DEFAULT '#CA8A04'::character varying NOT NULL,
    toolbar_button_hover_color character varying(7) DEFAULT '#A16207'::character varying NOT NULL,
    toolbar_button_text_color character varying(7) DEFAULT '#FFFFFF'::character varying NOT NULL,
    table_header_color character varying(7) DEFAULT '#CA8A04'::character varying NOT NULL,
    table_header_hover_color character varying(7) DEFAULT '#A16207'::character varying NOT NULL,
    table_header_text_color character varying(7) DEFAULT '#FFFFFF'::character varying NOT NULL
);

--
-- Name: external_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_assignments (
    external_assignment_id uuid NOT NULL,
    plan_node_id uuid NOT NULL,
    government_structure_id uuid NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    requires_report boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);

--
-- Name: form_config_containers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.form_config_containers (
    form_config_container_id uuid NOT NULL,
    issue_category_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    code character varying(80) NOT NULL,
    description text,
    version_number integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: form_config_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.form_config_fields (
    form_config_field_id uuid NOT NULL,
    form_config_container_id uuid NOT NULL,
    label character varying(200) NOT NULL,
    field_key character varying(80) NOT NULL,
    placeholder character varying(255),
    help_text text,
    field_type public.enum_form_config_fields_field_type DEFAULT 'TEXT'::public.enum_form_config_fields_field_type NOT NULL,
    required boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    default_value text,
    validation_rules jsonb DEFAULT '{}'::jsonb NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: government_structure_permission_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.government_structure_permission_groups (
    id uuid NOT NULL,
    government_structure_id uuid CONSTRAINT government_structure_permissio_government_structure_id_not_null NOT NULL,
    permission_group_id uuid CONSTRAINT government_structure_permission_gr_permission_group_id_not_null NOT NULL
);

--
-- Name: government_structures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.government_structures (
    government_structure_id uuid NOT NULL,
    parent_id uuid,
    name character varying(255) NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    logo_path character varying(500)
);

--
-- Name: internal_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.internal_assignments (
    internal_assignment_id uuid NOT NULL,
    plan_node_id uuid NOT NULL,
    internal_structure_id uuid,
    user_id uuid,
    action_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    branch_external_assignment_id uuid,
    branch_internal_assignment_id uuid,
    role_id uuid,
    permission_group_id uuid
);

--
-- Name: internal_structure_permission_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.internal_structure_permission_groups (
    id uuid NOT NULL,
    internal_structure_id uuid CONSTRAINT internal_structure_permission_gr_internal_structure_id_not_null NOT NULL,
    permission_group_id uuid CONSTRAINT internal_structure_permission_grou_permission_group_id_not_null NOT NULL
);

--
-- Name: internal_structures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.internal_structures (
    internal_structure_id uuid NOT NULL,
    government_structure_id uuid NOT NULL,
    parent_id uuid,
    name character varying(255) NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

--
-- Name: issue_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issue_attachments (
    issue_attachment_id uuid NOT NULL,
    issue_id uuid NOT NULL,
    attachment_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: issue_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issue_categories (
    issue_category_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_category_id uuid,
    code character varying(80),
    form_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_selectable boolean DEFAULT true NOT NULL
);

--
-- Name: issue_form_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issue_form_responses (
    issue_form_response_id uuid NOT NULL,
    issue_id uuid NOT NULL,
    form_config_field_id uuid NOT NULL,
    value_text text,
    value_json jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: issue_histories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issue_histories (
    issue_history_id uuid NOT NULL,
    issue_id uuid NOT NULL,
    action_type character varying(80) NOT NULL,
    field_name character varying(80),
    old_value text,
    new_value text,
    notes text,
    performed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: issue_priorities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issue_priorities (
    issue_priority_id uuid NOT NULL,
    code character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    color_hex character varying(7),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issues (
    issue_id uuid NOT NULL,
    issue_number character varying(30) NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    issue_category_id uuid NOT NULL,
    issue_priority_id uuid NOT NULL,
    status public.enum_issues_status DEFAULT 'submitted'::public.enum_issues_status NOT NULL,
    raised_by uuid NOT NULL,
    assigned_to uuid,
    entity_type character varying(100),
    entity_id uuid,
    current_value text,
    suggested_value text,
    justification text,
    response text,
    rejection_reason text,
    resolution_notes text,
    attachment_path character varying(500),
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    review_snapshot_id uuid,
    form_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    form_config_container_id uuid
);

--
-- Name: note_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.note_attachments (
    note_attachment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    note_id uuid NOT NULL,
    attachment_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    note_id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    pin_order integer
);

--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_templates (
    notification_template_id uuid NOT NULL,
    template_code character varying(80) NOT NULL,
    category public.enum_notification_templates_category NOT NULL,
    notification_type character varying(80) NOT NULL,
    title_template character varying(255) NOT NULL,
    message_template text NOT NULL,
    related_entity_type character varying(50),
    default_link_path character varying(500),
    icon_variant character varying(50) DEFAULT 'bell'::character varying NOT NULL,
    priority public.enum_notification_templates_priority DEFAULT 'normal'::public.enum_notification_templates_priority NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    notification_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    template_code character varying(80),
    category public.enum_notifications_category DEFAULT 'system'::public.enum_notifications_category NOT NULL,
    notification_type character varying(80) DEFAULT 'general'::character varying NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    related_entity_type character varying(50),
    related_entity_id uuid,
    link_path character varying(500),
    icon_variant character varying(50),
    priority public.enum_notifications_priority DEFAULT 'normal'::public.enum_notifications_priority NOT NULL,
    metadata jsonb,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: performance_color_thresholds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.performance_color_thresholds (
    performance_color_threshold_id uuid CONSTRAINT performance_color_threshold_performance_color_threshol_not_null NOT NULL,
    label character varying(100) NOT NULL,
    min_percentage integer NOT NULL,
    max_percentage integer NOT NULL,
    color_hex character varying(7) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: permission_group_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permission_group_permissions (
    permission_group_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: permission_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permission_groups (
    permission_group_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    group_kind character varying(20) DEFAULT 'standard'::character varying NOT NULL
);

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    permission_id uuid NOT NULL,
    resource character varying(100) NOT NULL,
    action character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    permission_tier character varying(20) DEFAULT 'standard'::character varying NOT NULL
);

--
-- Name: plan_amendment_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_amendment_actions (
    plan_amendment_action_id uuid NOT NULL,
    plan_amendment_id uuid NOT NULL,
    action_type public.enum_plan_amendment_actions_action_type NOT NULL,
    sequence integer DEFAULT 1 NOT NULL,
    status public.enum_plan_amendment_actions_status DEFAULT 'pending'::public.enum_plan_amendment_actions_status NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    preview jsonb,
    impact jsonb,
    depends_on_sequence integer,
    error_message text,
    applied_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

--
-- Name: plan_amendment_histories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_amendment_histories (
    plan_amendment_history_id uuid NOT NULL,
    plan_amendment_id uuid NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id uuid NOT NULL,
    field_name character varying(100) NOT NULL,
    old_value text,
    new_value text,
    changed_at timestamp with time zone NOT NULL,
    changed_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    plan_amendment_action_id uuid
);

--
-- Name: plan_amendments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_amendments (
    plan_amendment_id uuid NOT NULL,
    master_plan_version_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    amendment_type public.enum_plan_amendments_amendment_type NOT NULL,
    status public.enum_plan_amendments_status DEFAULT 'draft'::public.enum_plan_amendments_status NOT NULL,
    requested_by uuid NOT NULL,
    requested_at timestamp with time zone NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_comment text,
    applied_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    effective_date date,
    version integer,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    reason text,
    effective_mode public.enum_plan_amendments_effective_mode DEFAULT 'immediate'::public.enum_plan_amendments_effective_mode NOT NULL,
    expected_version integer,
    is_package boolean DEFAULT false NOT NULL,
    compensates_amendment_id uuid
);

--
-- Name: plan_assignment_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_assignment_actions (
    assignment_action_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    is_approval boolean DEFAULT false NOT NULL,
    is_execution boolean DEFAULT false NOT NULL,
    is_reporting boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: plan_node_action_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_node_action_logs (
    action_log_id uuid NOT NULL,
    plan_node_id uuid NOT NULL,
    action_id uuid NOT NULL,
    user_id uuid NOT NULL,
    comment text,
    status public.enum_plan_node_action_logs_status DEFAULT 'pending'::public.enum_plan_node_action_logs_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: plan_nodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_nodes (
    plan_node_id uuid NOT NULL,
    plan_version_id uuid NOT NULL,
    parent_id uuid,
    type public.enum_plan_nodes_type NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    weight double precision DEFAULT '0'::double precision NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    weight_mode public.enum_plan_nodes_weight_mode,
    assignment_sharing_mode public.enum_plan_nodes_assignment_sharing_mode DEFAULT 'exclusive'::public.enum_plan_nodes_assignment_sharing_mode NOT NULL,
    source_plan_node_id uuid,
    annual_target double precision,
    target_unit character varying(50),
    period_target double precision,
    assignment_context jsonb,
    period_actual double precision,
    period_actual_override boolean DEFAULT false NOT NULL,
    period_actual_status public.enum_plan_nodes_period_actual_status DEFAULT 'empty'::public.enum_plan_nodes_period_actual_status NOT NULL,
    period_actual_submitted_at timestamp with time zone,
    period_actual_submitted_by uuid,
    period_actual_approved_at timestamp with time zone,
    period_actual_approved_by uuid,
    period_actual_rejection_comment text,
    contribution_weight double precision,
    period_actual_validated_at timestamp with time zone,
    period_actual_validated_by uuid,
    target_allocation_mode public.enum_plan_nodes_target_allocation_mode DEFAULT 'divisible'::public.enum_plan_nodes_target_allocation_mode NOT NULL,
    achievement_mode public.enum_plan_nodes_achievement_mode DEFAULT 'period'::public.enum_plan_nodes_achievement_mode NOT NULL,
    annual_actual double precision,
    annual_actual_status public.enum_plan_nodes_annual_actual_status DEFAULT 'empty'::public.enum_plan_nodes_annual_actual_status NOT NULL,
    annual_actual_submitted_at timestamp with time zone,
    annual_actual_submitted_by uuid,
    annual_actual_approved_at timestamp with time zone,
    annual_actual_approved_by uuid,
    annual_actual_validated_at timestamp with time zone,
    annual_actual_validated_by uuid,
    annual_actual_rejection_comment text,
    period_actual_narration text,
    annual_actual_narration text
);

--
-- Name: plan_period_target_baselines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_period_target_baselines (
    plan_period_target_baseline_id uuid CONSTRAINT plan_period_target_baseline_plan_period_target_baselin_not_null NOT NULL,
    master_plan_version_id uuid NOT NULL,
    execution_snapshot_root_id uuid CONSTRAINT plan_period_target_baseline_execution_snapshot_root_id_not_null NOT NULL,
    annual_plan_version_id uuid NOT NULL,
    annual_kpi_plan_node_id uuid NOT NULL,
    period_version_id uuid NOT NULL,
    snapshot_period_plan_node_id uuid CONSTRAINT plan_period_target_baseline_snapshot_period_plan_node__not_null NOT NULL,
    original_target double precision NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

--
-- Name: plan_rule_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_rule_steps (
    plan_rule_step_id uuid NOT NULL,
    plan_rule_id uuid NOT NULL,
    step_order integer NOT NULL,
    node_type public.enum_plan_rule_steps_node_type NOT NULL,
    label character varying(255),
    requires_weight boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    color_hex character varying(7),
    requires_contribution_weight boolean DEFAULT false NOT NULL
);

--
-- Name: plan_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_rules (
    plan_rule_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    government_structure_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    inherit_to_descendants boolean DEFAULT false NOT NULL,
    owned_by_plan_version_id uuid,
    source_plan_rule_id uuid,
    performance_scoring_policy public.enum_plan_rules_performance_scoring_policy DEFAULT 'CAP_100'::public.enum_plan_rules_performance_scoring_policy NOT NULL,
    amendment_policy jsonb DEFAULT '{"allow_ownership_transfer": true, "automatic_redistribution": "manual", "allow_emergency_approvals": false, "completed_periods_editable": false, "allow_structural_amendments_after_execution": true}'::jsonb NOT NULL
);

--
-- Name: plan_sector_aggregation_publishes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_sector_aggregation_publishes (
    id uuid NOT NULL,
    plan_version_id uuid NOT NULL,
    external_assignment_id uuid CONSTRAINT plan_sector_aggregation_publish_external_assignment_id_not_null NOT NULL,
    government_structure_id uuid CONSTRAINT plan_sector_aggregation_publis_government_structure_id_not_null NOT NULL,
    status public.enum_plan_sector_aggregation_publishes_status DEFAULT 'pending'::public.enum_plan_sector_aggregation_publishes_status NOT NULL,
    published_by uuid,
    published_at timestamp with time zone,
    rejection_comment text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

--
-- Name: plan_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_versions (
    plan_version_id uuid NOT NULL,
    year integer NOT NULL,
    version_number integer DEFAULT 1 NOT NULL,
    status public.enum_plan_versions_status DEFAULT 'draft'::public.enum_plan_versions_status NOT NULL,
    government_structure_id uuid NOT NULL,
    based_on_version_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    plan_rule_id uuid,
    draft_name character varying(255) NOT NULL,
    start_year integer NOT NULL,
    end_year integer NOT NULL,
    planning_duration_years integer NOT NULL,
    planning_start_date date NOT NULL,
    planning_end_date date NOT NULL,
    start_month integer NOT NULL,
    end_month integer NOT NULL,
    version_kind public.enum_plan_versions_version_kind DEFAULT 'master'::public.enum_plan_versions_version_kind NOT NULL,
    parent_plan_version_id uuid,
    planning_year integer,
    sequence_index integer,
    is_locked boolean DEFAULT false NOT NULL,
    finalized_at timestamp with time zone,
    period_label character varying(100),
    annual_targets_finalized_at timestamp with time zone,
    period_subdivision_mode public.enum_plan_versions_period_subdivision_mode,
    period_targets_finalized_at timestamp with time zone,
    process_started_at timestamp with time zone,
    review_status public.enum_plan_versions_review_status,
    published_for_review_at timestamp with time zone,
    review_unlocked_at timestamp with time zone,
    review_completed_at timestamp with time zone,
    review_snapshot_of_version_id uuid,
    review_snapshot_root_id uuid,
    active_review_snapshot_id uuid,
    review_version_number integer,
    execution_snapshot_of_version_id uuid,
    execution_snapshot_root_id uuid,
    active_execution_snapshot_id uuid,
    execution_version_number integer,
    execution_status public.enum_plan_versions_execution_status,
    planning_configuration_id uuid
);

--
-- Name: planning_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planning_configurations (
    planning_configuration_id uuid NOT NULL,
    government_structure_id uuid,
    min_duration_years integer DEFAULT 1 NOT NULL,
    max_duration_years integer DEFAULT 10 NOT NULL,
    draft_entity_label_singular character varying(100) DEFAULT 'Plan Draft'::character varying NOT NULL,
    draft_entity_label_plural character varying(100) DEFAULT 'Plan Drafts'::character varying NOT NULL,
    create_action_label character varying(120) DEFAULT 'Create Plan Draft'::character varying NOT NULL,
    planning_period_label character varying(100) DEFAULT 'Planning Period'::character varying NOT NULL,
    duration_label character varying(100) DEFAULT 'Duration'::character varying NOT NULL,
    start_year_label character varying(100) DEFAULT 'Start Year'::character varying NOT NULL,
    end_year_label character varying(100) DEFAULT 'End Year'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    target_units json NOT NULL,
    breakdown_mode public.enum_planning_configurations_breakdown_mode DEFAULT 'quarterly'::public.enum_planning_configurations_breakdown_mode NOT NULL,
    custom_periods json DEFAULT '[]'::json NOT NULL,
    owned_by_plan_version_id uuid,
    source_planning_configuration_id uuid
);

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    role_permission_id uuid NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    role_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    government_structure_id uuid,
    scope character varying(20) DEFAULT 'structure'::character varying NOT NULL
);

--
-- Name: system_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_audit_logs (
    system_audit_log_id uuid NOT NULL,
    module character varying(100) NOT NULL,
    action character varying(50) NOT NULL,
    entity_id uuid,
    entity_label character varying(255),
    summary text,
    previous_values jsonb,
    new_values jsonb,
    changed_by uuid NOT NULL,
    ip_address character varying(45),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    system_setting_id uuid NOT NULL,
    expose_required_permissions boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    allow_achievement_assignment_bypass boolean DEFAULT false NOT NULL
);

--
-- Name: target_allocation_histories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.target_allocation_histories (
    target_allocation_history_id uuid CONSTRAINT target_allocation_histories_target_allocation_history__not_null NOT NULL,
    master_plan_version_id uuid NOT NULL,
    annual_kpi_plan_node_id uuid NOT NULL,
    period_version_id uuid NOT NULL,
    period_plan_node_id uuid NOT NULL,
    old_target double precision NOT NULL,
    new_target double precision NOT NULL,
    change_type public.enum_target_allocation_histories_change_type DEFAULT 'reallocation'::public.enum_target_allocation_histories_change_type NOT NULL,
    reference_id uuid NOT NULL,
    reason text NOT NULL,
    changed_by uuid NOT NULL,
    changed_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

--
-- Name: target_reallocation_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.target_reallocation_requests (
    target_reallocation_request_id uuid CONSTRAINT target_reallocation_request_target_reallocation_reques_not_null NOT NULL,
    master_plan_version_id uuid NOT NULL,
    execution_snapshot_root_id uuid CONSTRAINT target_reallocation_request_execution_snapshot_root_id_not_null NOT NULL,
    annual_plan_version_id uuid NOT NULL,
    annual_kpi_plan_node_id uuid NOT NULL,
    from_period_version_id uuid NOT NULL,
    to_period_version_id uuid NOT NULL,
    from_period_plan_node_id uuid NOT NULL,
    to_period_plan_node_id uuid NOT NULL,
    amount double precision NOT NULL,
    reason text NOT NULL,
    status public.enum_target_reallocation_requests_status DEFAULT 'pending'::public.enum_target_reallocation_requests_status NOT NULL,
    requested_by uuid NOT NULL,
    requested_at timestamp with time zone NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_comment text,
    applied_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    plan_amendment_id uuid
);

--
-- Name: user_permission_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_permission_groups (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    permission_group_id uuid NOT NULL
);

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    user_role_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    user_id uuid NOT NULL,
    full_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    phone_number character varying(50),
    profile_image character varying(255),
    is_first_logged_in boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone,
    password_changed_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    government_structure_id uuid,
    internal_structure_id uuid,
    otp character varying(255),
    otp_expiry timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (attachment_id);

--
-- Name: branding_audit_logs branding_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding_audit_logs
    ADD CONSTRAINT branding_audit_logs_pkey PRIMARY KEY (branding_audit_log_id);

--
-- Name: branding_settings branding_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding_settings
    ADD CONSTRAINT branding_settings_pkey PRIMARY KEY (branding_setting_id);

--
-- Name: external_assignments external_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_assignments
    ADD CONSTRAINT external_assignments_pkey PRIMARY KEY (external_assignment_id);

--
-- Name: form_config_containers form_config_containers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_config_containers
    ADD CONSTRAINT form_config_containers_code_key UNIQUE (code);

--
-- Name: form_config_containers form_config_containers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_config_containers
    ADD CONSTRAINT form_config_containers_pkey PRIMARY KEY (form_config_container_id);

--
-- Name: form_config_fields form_config_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_config_fields
    ADD CONSTRAINT form_config_fields_pkey PRIMARY KEY (form_config_field_id);

--
-- Name: government_structure_permission_groups government_structure_permission_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.government_structure_permission_groups
    ADD CONSTRAINT government_structure_permission_groups_pkey PRIMARY KEY (id);

--
-- Name: government_structures government_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.government_structures
    ADD CONSTRAINT government_structures_pkey PRIMARY KEY (government_structure_id);

--
-- Name: internal_assignments internal_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_assignments
    ADD CONSTRAINT internal_assignments_pkey PRIMARY KEY (internal_assignment_id);

--
-- Name: internal_structure_permission_groups internal_structure_permission_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_structure_permission_groups
    ADD CONSTRAINT internal_structure_permission_groups_pkey PRIMARY KEY (id);

--
-- Name: internal_structures internal_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_structures
    ADD CONSTRAINT internal_structures_pkey PRIMARY KEY (internal_structure_id);

--
-- Name: issue_attachments issue_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_attachments
    ADD CONSTRAINT issue_attachments_pkey PRIMARY KEY (issue_attachment_id);

--
-- Name: issue_categories issue_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_categories
    ADD CONSTRAINT issue_categories_code_key UNIQUE (code);

--
-- Name: issue_categories issue_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_categories
    ADD CONSTRAINT issue_categories_pkey PRIMARY KEY (issue_category_id);

--
-- Name: issue_form_responses issue_form_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_form_responses
    ADD CONSTRAINT issue_form_responses_pkey PRIMARY KEY (issue_form_response_id);

--
-- Name: issue_histories issue_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_histories
    ADD CONSTRAINT issue_histories_pkey PRIMARY KEY (issue_history_id);

--
-- Name: issue_priorities issue_priorities_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_priorities
    ADD CONSTRAINT issue_priorities_code_key UNIQUE (code);

--
-- Name: issue_priorities issue_priorities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_priorities
    ADD CONSTRAINT issue_priorities_pkey PRIMARY KEY (issue_priority_id);

--
-- Name: issues issues_issue_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_issue_number_key UNIQUE (issue_number);

--
-- Name: issues issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_pkey PRIMARY KEY (issue_id);

--
-- Name: note_attachments note_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_attachments
    ADD CONSTRAINT note_attachments_pkey PRIMARY KEY (note_attachment_id);

--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (note_id);

--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (notification_template_id);

--
-- Name: notification_templates notification_templates_template_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_template_code_key UNIQUE (template_code);

--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (notification_id);

--
-- Name: performance_color_thresholds performance_color_thresholds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_color_thresholds
    ADD CONSTRAINT performance_color_thresholds_pkey PRIMARY KEY (performance_color_threshold_id);

--
-- Name: permission_groups permission_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_groups
    ADD CONSTRAINT permission_groups_pkey PRIMARY KEY (permission_group_id);

--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (permission_id);

--
-- Name: permission_group_permissions pk_permission_group_permissions; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_group_permissions
    ADD CONSTRAINT pk_permission_group_permissions PRIMARY KEY (permission_group_id, permission_id);

--
-- Name: plan_amendment_actions plan_amendment_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_amendment_actions
    ADD CONSTRAINT plan_amendment_actions_pkey PRIMARY KEY (plan_amendment_action_id);

--
-- Name: plan_amendment_histories plan_amendment_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_amendment_histories
    ADD CONSTRAINT plan_amendment_histories_pkey PRIMARY KEY (plan_amendment_history_id);

--
-- Name: plan_amendments plan_amendments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_amendments
    ADD CONSTRAINT plan_amendments_pkey PRIMARY KEY (plan_amendment_id);

--
-- Name: plan_assignment_actions plan_assignment_actions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_assignment_actions
    ADD CONSTRAINT plan_assignment_actions_code_key UNIQUE (code);

--
-- Name: plan_assignment_actions plan_assignment_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_assignment_actions
    ADD CONSTRAINT plan_assignment_actions_pkey PRIMARY KEY (assignment_action_id);

--
-- Name: plan_node_action_logs plan_node_action_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_node_action_logs
    ADD CONSTRAINT plan_node_action_logs_pkey PRIMARY KEY (action_log_id);

--
-- Name: plan_nodes plan_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_nodes
    ADD CONSTRAINT plan_nodes_pkey PRIMARY KEY (plan_node_id);

--
-- Name: plan_period_target_baselines plan_period_target_baselines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_period_target_baselines
    ADD CONSTRAINT plan_period_target_baselines_pkey PRIMARY KEY (plan_period_target_baseline_id);

--
-- Name: plan_rule_steps plan_rule_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_rule_steps
    ADD CONSTRAINT plan_rule_steps_pkey PRIMARY KEY (plan_rule_step_id);

--
-- Name: plan_rules plan_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_rules
    ADD CONSTRAINT plan_rules_pkey PRIMARY KEY (plan_rule_id);

--
-- Name: plan_sector_aggregation_publishes plan_sector_aggregation_publishes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_sector_aggregation_publishes
    ADD CONSTRAINT plan_sector_aggregation_publishes_pkey PRIMARY KEY (id);

--
-- Name: plan_versions plan_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_versions
    ADD CONSTRAINT plan_versions_pkey PRIMARY KEY (plan_version_id);

--
-- Name: planning_configurations planning_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_configurations
    ADD CONSTRAINT planning_configurations_pkey PRIMARY KEY (planning_configuration_id);

--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_permission_id);

--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);

--
-- Name: system_audit_logs system_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_audit_logs
    ADD CONSTRAINT system_audit_logs_pkey PRIMARY KEY (system_audit_log_id);

--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (system_setting_id);

--
-- Name: target_allocation_histories target_allocation_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_allocation_histories
    ADD CONSTRAINT target_allocation_histories_pkey PRIMARY KEY (target_allocation_history_id);

--
-- Name: target_reallocation_requests target_reallocation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_reallocation_requests
    ADD CONSTRAINT target_reallocation_requests_pkey PRIMARY KEY (target_reallocation_request_id);

--
-- Name: user_permission_groups user_permission_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permission_groups
    ADD CONSTRAINT user_permission_groups_pkey PRIMARY KEY (id);

--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_role_id);

--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

--
-- Name: users users_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_number_key UNIQUE (phone_number);

--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);

--
-- Name: branding_settings_global_row_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX branding_settings_global_row_unique ON public.branding_settings USING btree ((1)) WHERE (government_structure_id IS NULL);

--
-- Name: branding_settings_government_structure_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX branding_settings_government_structure_id_unique ON public.branding_settings USING btree (government_structure_id) WHERE (government_structure_id IS NOT NULL);

--
-- Name: external_assignments_active_node_govt_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX external_assignments_active_node_govt_unique ON public.external_assignments USING btree (plan_node_id, government_structure_id) WHERE (is_active = true);

--
-- Name: external_assignments_govt_structure_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX external_assignments_govt_structure_id_idx ON public.external_assignments USING btree (government_structure_id);

--
-- Name: external_assignments_plan_node_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX external_assignments_plan_node_id_idx ON public.external_assignments USING btree (plan_node_id);

--
-- Name: idx_external_assignments_govt_structure_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_assignments_govt_structure_id ON public.external_assignments USING btree (government_structure_id);

--
-- Name: idx_external_assignments_plan_node_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_assignments_plan_node_id ON public.external_assignments USING btree (plan_node_id);

--
-- Name: idx_form_config_containers_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_form_config_containers_published ON public.form_config_containers USING btree (is_active, is_published, display_order);

--
-- Name: idx_internal_assignments_internal_structure_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_assignments_internal_structure_id ON public.internal_assignments USING btree (internal_structure_id);

--
-- Name: idx_internal_assignments_permission_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_assignments_permission_group_id ON public.internal_assignments USING btree (permission_group_id);

--
-- Name: idx_internal_assignments_plan_node_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_assignments_plan_node_id ON public.internal_assignments USING btree (plan_node_id);

--
-- Name: idx_internal_assignments_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_assignments_role_id ON public.internal_assignments USING btree (role_id);

--
-- Name: idx_internal_assignments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_assignments_user_id ON public.internal_assignments USING btree (user_id);

--
-- Name: idx_internal_structure_permission_groups_internal_structure_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_structure_permission_groups_internal_structure_id ON public.internal_structure_permission_groups USING btree (internal_structure_id);

--
-- Name: idx_internal_structure_permission_groups_permission_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_structure_permission_groups_permission_group_id ON public.internal_structure_permission_groups USING btree (permission_group_id);

--
-- Name: idx_issue_categories_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_issue_categories_code ON public.issue_categories USING btree (code) WHERE (code IS NOT NULL);

--
-- Name: idx_issue_categories_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issue_categories_parent ON public.issue_categories USING btree (parent_category_id);

--
-- Name: idx_issue_histories_issue_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issue_histories_issue_id ON public.issue_histories USING btree (issue_id);

--
-- Name: idx_issues_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issues_assigned_to ON public.issues USING btree (assigned_to);

--
-- Name: idx_issues_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issues_category ON public.issues USING btree (issue_category_id);

--
-- Name: idx_issues_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issues_entity ON public.issues USING btree (entity_type, entity_id);

--
-- Name: idx_issues_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issues_priority ON public.issues USING btree (issue_priority_id);

--
-- Name: idx_issues_raised_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issues_raised_by ON public.issues USING btree (raised_by);

--
-- Name: idx_issues_review_snapshot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issues_review_snapshot_id ON public.issues USING btree (review_snapshot_id) WHERE (review_snapshot_id IS NOT NULL);

--
-- Name: idx_issues_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issues_status ON public.issues USING btree (status);

--
-- Name: idx_notifications_recipient_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_recipient_category ON public.notifications USING btree (recipient_id, category);

--
-- Name: idx_notifications_recipient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_recipient_id ON public.notifications USING btree (recipient_id);

--
-- Name: idx_notifications_recipient_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_recipient_read ON public.notifications USING btree (recipient_id, is_read);

--
-- Name: idx_performance_color_thresholds_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_color_thresholds_is_active ON public.performance_color_thresholds USING btree (is_active);

--
-- Name: idx_performance_color_thresholds_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_color_thresholds_sort_order ON public.performance_color_thresholds USING btree (sort_order);

--
-- Name: idx_permissions_resource_action_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_permissions_resource_action_unique ON public.permissions USING btree (lower((resource)::text), lower((action)::text));

--
-- Name: idx_plan_node_action_logs_action_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_node_action_logs_action_id ON public.plan_node_action_logs USING btree (action_id);

--
-- Name: idx_plan_node_action_logs_plan_node_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_node_action_logs_plan_node_id ON public.plan_node_action_logs USING btree (plan_node_id);

--
-- Name: idx_plan_node_action_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_node_action_logs_user_id ON public.plan_node_action_logs USING btree (user_id);

--
-- Name: idx_plan_nodes_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_nodes_parent_id ON public.plan_nodes USING btree (parent_id);

--
-- Name: idx_plan_nodes_period_actual_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_nodes_period_actual_status ON public.plan_nodes USING btree (period_actual_status);

--
-- Name: idx_plan_nodes_plan_version_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_nodes_plan_version_id ON public.plan_nodes USING btree (plan_version_id);

--
-- Name: idx_plan_versions_active_execution_snapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_versions_active_execution_snapshot ON public.plan_versions USING btree (active_execution_snapshot_id) WHERE (active_execution_snapshot_id IS NOT NULL);

--
-- Name: idx_plan_versions_active_review_snapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_versions_active_review_snapshot ON public.plan_versions USING btree (active_review_snapshot_id) WHERE (active_review_snapshot_id IS NOT NULL);

--
-- Name: idx_plan_versions_execution_snapshot_root; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_versions_execution_snapshot_root ON public.plan_versions USING btree (execution_snapshot_root_id) WHERE (execution_snapshot_root_id IS NOT NULL);

--
-- Name: idx_plan_versions_review_snapshot_root; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_versions_review_snapshot_root ON public.plan_versions USING btree (review_snapshot_root_id) WHERE (review_snapshot_root_id IS NOT NULL);

--
-- Name: idx_plan_versions_review_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_versions_review_status ON public.plan_versions USING btree (review_status) WHERE (review_status IS NOT NULL);

--
-- Name: idx_roles_government_structure_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roles_government_structure_id ON public.roles USING btree (government_structure_id);

--
-- Name: idx_system_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_audit_logs_action ON public.system_audit_logs USING btree (action);

--
-- Name: idx_system_audit_logs_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_audit_logs_changed_by ON public.system_audit_logs USING btree (changed_by);

--
-- Name: idx_system_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_audit_logs_created_at ON public.system_audit_logs USING btree (created_at);

--
-- Name: idx_system_audit_logs_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_audit_logs_module ON public.system_audit_logs USING btree (module);

--
-- Name: internal_assignments_active_node_dept_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX internal_assignments_active_node_dept_unique ON public.internal_assignments USING btree (plan_node_id, internal_structure_id) WHERE ((is_active = true) AND (internal_structure_id IS NOT NULL));

--
-- Name: internal_assignments_active_node_user_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX internal_assignments_active_node_user_unique ON public.internal_assignments USING btree (plan_node_id, user_id) WHERE ((is_active = true) AND (user_id IS NOT NULL));

--
-- Name: internal_assignments_internal_structure_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX internal_assignments_internal_structure_id_idx ON public.internal_assignments USING btree (internal_structure_id);

--
-- Name: internal_assignments_plan_node_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX internal_assignments_plan_node_id_idx ON public.internal_assignments USING btree (plan_node_id);

--
-- Name: internal_assignments_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX internal_assignments_user_id_idx ON public.internal_assignments USING btree (user_id);

--
-- Name: note_attachments_note_attachment_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX note_attachments_note_attachment_unique ON public.note_attachments USING btree (note_id, attachment_id);

--
-- Name: notes_created_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_created_by_idx ON public.notes USING btree (created_by);

--
-- Name: notes_deleted_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_deleted_at_idx ON public.notes USING btree (deleted_at);

--
-- Name: notes_is_archived_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_is_archived_idx ON public.notes USING btree (is_archived);

--
-- Name: notes_is_pinned_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_is_pinned_idx ON public.notes USING btree (is_pinned);

--
-- Name: notes_pin_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_pin_order_idx ON public.notes USING btree (created_by, is_pinned, pin_order);

--
-- Name: notes_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notes_status_idx ON public.notes USING btree (status);

--
-- Name: notifications_recipient_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_recipient_category_idx ON public.notifications USING btree (recipient_id, category);

--
-- Name: notifications_recipient_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_recipient_id_idx ON public.notifications USING btree (recipient_id);

--
-- Name: notifications_recipient_read_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_recipient_read_idx ON public.notifications USING btree (recipient_id, is_read);

--
-- Name: performance_color_thresholds_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX performance_color_thresholds_is_active ON public.performance_color_thresholds USING btree (is_active);

--
-- Name: performance_color_thresholds_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX performance_color_thresholds_sort_order ON public.performance_color_thresholds USING btree (sort_order);

--
-- Name: plan_amendment_actions_amendment_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_amendment_actions_amendment_idx ON public.plan_amendment_actions USING btree (plan_amendment_id);

--
-- Name: plan_amendment_actions_amendment_sequence_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX plan_amendment_actions_amendment_sequence_unique ON public.plan_amendment_actions USING btree (plan_amendment_id, sequence);

--
-- Name: plan_amendment_actions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_amendment_actions_status_idx ON public.plan_amendment_actions USING btree (status);

--
-- Name: plan_amendment_actions_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_amendment_actions_type_idx ON public.plan_amendment_actions USING btree (action_type);

--
-- Name: plan_amendment_histories_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_amendment_histories_action_idx ON public.plan_amendment_histories USING btree (plan_amendment_action_id);

--
-- Name: plan_amendment_histories_amendment_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_amendment_histories_amendment_idx ON public.plan_amendment_histories USING btree (plan_amendment_id);

--
-- Name: plan_amendment_histories_changed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_amendment_histories_changed_at_idx ON public.plan_amendment_histories USING btree (changed_at);

--
-- Name: plan_amendment_histories_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_amendment_histories_entity_idx ON public.plan_amendment_histories USING btree (entity_type, entity_id);

--
-- Name: plan_amendments_master_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_amendments_master_idx ON public.plan_amendments USING btree (master_plan_version_id);

--
-- Name: plan_amendments_master_version_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX plan_amendments_master_version_unique ON public.plan_amendments USING btree (master_plan_version_id, version) WHERE (version IS NOT NULL);

--
-- Name: plan_amendments_requested_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_amendments_requested_at_idx ON public.plan_amendments USING btree (requested_at);

--
-- Name: plan_amendments_requester_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_amendments_requester_idx ON public.plan_amendments USING btree (requested_by);

--
-- Name: plan_amendments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_amendments_status_idx ON public.plan_amendments USING btree (status);

--
-- Name: plan_amendments_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_amendments_type_idx ON public.plan_amendments USING btree (amendment_type);

--
-- Name: plan_amendments_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_amendments_version_idx ON public.plan_amendments USING btree (version);

--
-- Name: plan_node_action_logs_action_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_node_action_logs_action_id_idx ON public.plan_node_action_logs USING btree (action_id);

--
-- Name: plan_node_action_logs_plan_node_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_node_action_logs_plan_node_id_idx ON public.plan_node_action_logs USING btree (plan_node_id);

--
-- Name: plan_node_action_logs_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_node_action_logs_user_id_idx ON public.plan_node_action_logs USING btree (user_id);

--
-- Name: plan_nodes_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_nodes_parent_id_idx ON public.plan_nodes USING btree (parent_id);

--
-- Name: plan_nodes_parent_title_version_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX plan_nodes_parent_title_version_unique ON public.plan_nodes USING btree (parent_id, title, plan_version_id);

--
-- Name: plan_nodes_plan_version_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_nodes_plan_version_id_idx ON public.plan_nodes USING btree (plan_version_id);

--
-- Name: plan_period_target_baseline_master_kpi_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_period_target_baseline_master_kpi_period_idx ON public.plan_period_target_baselines USING btree (master_plan_version_id, annual_kpi_plan_node_id, period_version_id);

--
-- Name: plan_period_target_baseline_snapshot_node_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX plan_period_target_baseline_snapshot_node_unique ON public.plan_period_target_baselines USING btree (execution_snapshot_root_id, snapshot_period_plan_node_id);

--
-- Name: plan_rule_steps_rule_order_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX plan_rule_steps_rule_order_unique ON public.plan_rule_steps USING btree (plan_rule_id, step_order);

--
-- Name: plan_sector_agg_publish_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_sector_agg_publish_status_idx ON public.plan_sector_aggregation_publishes USING btree (status);

--
-- Name: plan_sector_agg_publish_version_branch_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX plan_sector_agg_publish_version_branch_unique ON public.plan_sector_aggregation_publishes USING btree (plan_version_id, external_assignment_id);

--
-- Name: plan_sector_agg_publish_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_sector_agg_publish_version_idx ON public.plan_sector_aggregation_publishes USING btree (plan_version_id);

--
-- Name: plan_versions_parent_sequence_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX plan_versions_parent_sequence_unique ON public.plan_versions USING btree (parent_plan_version_id, sequence_index) WHERE (parent_plan_version_id IS NOT NULL);

--
-- Name: roles_global_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX roles_global_name_unique ON public.roles USING btree (lower((name)::text)) WHERE (((scope)::text = 'global'::text) AND (deleted_at IS NULL));

--
-- Name: roles_private_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX roles_private_name_unique ON public.roles USING btree (lower((name)::text)) WHERE (((scope)::text = 'private'::text) AND (deleted_at IS NULL));

--
-- Name: roles_structure_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX roles_structure_name_unique ON public.roles USING btree (lower((name)::text), government_structure_id) WHERE (((scope)::text = 'structure'::text) AND (deleted_at IS NULL));

--
-- Name: system_audit_logs_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX system_audit_logs_action_idx ON public.system_audit_logs USING btree (action);

--
-- Name: system_audit_logs_changed_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX system_audit_logs_changed_by_idx ON public.system_audit_logs USING btree (changed_by);

--
-- Name: system_audit_logs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX system_audit_logs_created_at_idx ON public.system_audit_logs USING btree (created_at);

--
-- Name: system_audit_logs_module_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX system_audit_logs_module_idx ON public.system_audit_logs USING btree (module);

--
-- Name: target_allocation_histories_changed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX target_allocation_histories_changed_at_idx ON public.target_allocation_histories USING btree (changed_at);

--
-- Name: target_allocation_histories_master_kpi_period_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX target_allocation_histories_master_kpi_period_idx ON public.target_allocation_histories USING btree (master_plan_version_id, annual_kpi_plan_node_id, period_version_id);

--
-- Name: target_allocation_histories_reference_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX target_allocation_histories_reference_idx ON public.target_allocation_histories USING btree (reference_id);

--
-- Name: target_reallocation_requests_amendment_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX target_reallocation_requests_amendment_unique ON public.target_reallocation_requests USING btree (plan_amendment_id);

--
-- Name: target_reallocation_requests_kpi_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX target_reallocation_requests_kpi_idx ON public.target_reallocation_requests USING btree (annual_kpi_plan_node_id);

--
-- Name: target_reallocation_requests_master_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX target_reallocation_requests_master_idx ON public.target_reallocation_requests USING btree (master_plan_version_id);

--
-- Name: target_reallocation_requests_periods_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX target_reallocation_requests_periods_idx ON public.target_reallocation_requests USING btree (from_period_version_id, to_period_version_id);

--
-- Name: target_reallocation_requests_requested_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX target_reallocation_requests_requested_at_idx ON public.target_reallocation_requests USING btree (requested_at);

--
-- Name: target_reallocation_requests_requester_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX target_reallocation_requests_requester_idx ON public.target_reallocation_requests USING btree (requested_by);

--
-- Name: target_reallocation_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX target_reallocation_requests_status_idx ON public.target_reallocation_requests USING btree (status);

--
-- Name: uq_external_assignments_active_node_govt; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_external_assignments_active_node_govt ON public.external_assignments USING btree (plan_node_id, government_structure_id) WHERE (is_active = true);

--
-- Name: uq_form_config_fields_container_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_form_config_fields_container_key ON public.form_config_fields USING btree (form_config_container_id, field_key);

--
-- Name: uq_internal_assignments_active_node_dept; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_internal_assignments_active_node_dept ON public.internal_assignments USING btree (plan_node_id, internal_structure_id) WHERE ((is_active = true) AND (internal_structure_id IS NOT NULL));

--
-- Name: uq_internal_assignments_active_node_permission_group; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_internal_assignments_active_node_permission_group ON public.internal_assignments USING btree (plan_node_id, permission_group_id) WHERE ((is_active = true) AND (permission_group_id IS NOT NULL));

--
-- Name: uq_internal_assignments_active_node_role; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_internal_assignments_active_node_role ON public.internal_assignments USING btree (plan_node_id, role_id) WHERE ((is_active = true) AND (role_id IS NOT NULL));

--
-- Name: uq_internal_assignments_active_node_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_internal_assignments_active_node_user ON public.internal_assignments USING btree (plan_node_id, user_id) WHERE ((is_active = true) AND (user_id IS NOT NULL));

--
-- Name: uq_internal_structure_permission_groups_pair; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_internal_structure_permission_groups_pair ON public.internal_structure_permission_groups USING btree (internal_structure_id, permission_group_id);

--
-- Name: uq_issue_attachments_issue_attachment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_issue_attachments_issue_attachment ON public.issue_attachments USING btree (issue_id, attachment_id);

--
-- Name: uq_issue_form_responses_issue_field; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_issue_form_responses_issue_field ON public.issue_form_responses USING btree (issue_id, form_config_field_id);

--
-- Name: uq_plan_nodes_parent_title_version; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_plan_nodes_parent_title_version ON public.plan_nodes USING btree (parent_id, title, plan_version_id);

--
-- Name: uq_plan_rule_steps_rule_order; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_plan_rule_steps_rule_order ON public.plan_rule_steps USING btree (plan_rule_id, step_order);

--
-- Name: uq_plan_rules_owned_by_plan_version; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_plan_rules_owned_by_plan_version ON public.plan_rules USING btree (owned_by_plan_version_id) WHERE (owned_by_plan_version_id IS NOT NULL);

--
-- Name: uq_plan_versions_master_year_version_govt; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_plan_versions_master_year_version_govt ON public.plan_versions USING btree (year, version_number, government_structure_id) WHERE ((version_kind = 'master'::public.enum_plan_versions_version_kind) AND (review_snapshot_of_version_id IS NULL) AND (execution_snapshot_of_version_id IS NULL));

--
-- Name: uq_plan_versions_parent_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_plan_versions_parent_sequence ON public.plan_versions USING btree (parent_plan_version_id, sequence_index) WHERE (parent_plan_version_id IS NOT NULL);

--
-- Name: uq_planning_configurations_owned_by_plan_version; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_planning_configurations_owned_by_plan_version ON public.planning_configurations USING btree (owned_by_plan_version_id) WHERE (owned_by_plan_version_id IS NOT NULL);

--
-- Name: branding_audit_logs branding_audit_logs_branding_setting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding_audit_logs
    ADD CONSTRAINT branding_audit_logs_branding_setting_id_fkey FOREIGN KEY (branding_setting_id) REFERENCES public.branding_settings(branding_setting_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: branding_audit_logs branding_audit_logs_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding_audit_logs
    ADD CONSTRAINT branding_audit_logs_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: branding_settings branding_settings_government_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding_settings
    ADD CONSTRAINT branding_settings_government_structure_id_fkey FOREIGN KEY (government_structure_id) REFERENCES public.government_structures(government_structure_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: external_assignments external_assignments_government_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_assignments
    ADD CONSTRAINT external_assignments_government_structure_id_fkey FOREIGN KEY (government_structure_id) REFERENCES public.government_structures(government_structure_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: external_assignments external_assignments_plan_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_assignments
    ADD CONSTRAINT external_assignments_plan_node_id_fkey FOREIGN KEY (plan_node_id) REFERENCES public.plan_nodes(plan_node_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: form_config_containers form_config_containers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_config_containers
    ADD CONSTRAINT form_config_containers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: form_config_containers form_config_containers_issue_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_config_containers
    ADD CONSTRAINT form_config_containers_issue_category_id_fkey FOREIGN KEY (issue_category_id) REFERENCES public.issue_categories(issue_category_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: form_config_containers form_config_containers_issue_category_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_config_containers
    ADD CONSTRAINT form_config_containers_issue_category_id_fkey1 FOREIGN KEY (issue_category_id) REFERENCES public.issue_categories(issue_category_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: form_config_containers form_config_containers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_config_containers
    ADD CONSTRAINT form_config_containers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: form_config_fields form_config_fields_form_config_container_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_config_fields
    ADD CONSTRAINT form_config_fields_form_config_container_id_fkey FOREIGN KEY (form_config_container_id) REFERENCES public.form_config_containers(form_config_container_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: government_structure_permission_groups government_structure_permission_gr_government_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.government_structure_permission_groups
    ADD CONSTRAINT government_structure_permission_gr_government_structure_id_fkey FOREIGN KEY (government_structure_id) REFERENCES public.government_structures(government_structure_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: government_structure_permission_groups government_structure_permission_groups_permission_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.government_structure_permission_groups
    ADD CONSTRAINT government_structure_permission_groups_permission_group_id_fkey FOREIGN KEY (permission_group_id) REFERENCES public.permission_groups(permission_group_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: government_structures government_structures_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.government_structures
    ADD CONSTRAINT government_structures_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.government_structures(government_structure_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: internal_assignments internal_assignments_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_assignments
    ADD CONSTRAINT internal_assignments_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.plan_assignment_actions(assignment_action_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: internal_assignments internal_assignments_action_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_assignments
    ADD CONSTRAINT internal_assignments_action_id_fkey1 FOREIGN KEY (action_id) REFERENCES public.plan_assignment_actions(assignment_action_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: internal_assignments internal_assignments_action_id_fkey2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_assignments
    ADD CONSTRAINT internal_assignments_action_id_fkey2 FOREIGN KEY (action_id) REFERENCES public.plan_assignment_actions(assignment_action_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: internal_assignments internal_assignments_branch_external_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_assignments
    ADD CONSTRAINT internal_assignments_branch_external_assignment_id_fkey FOREIGN KEY (branch_external_assignment_id) REFERENCES public.external_assignments(external_assignment_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: internal_assignments internal_assignments_branch_internal_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_assignments
    ADD CONSTRAINT internal_assignments_branch_internal_assignment_id_fkey FOREIGN KEY (branch_internal_assignment_id) REFERENCES public.internal_assignments(internal_assignment_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: internal_assignments internal_assignments_internal_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_assignments
    ADD CONSTRAINT internal_assignments_internal_structure_id_fkey FOREIGN KEY (internal_structure_id) REFERENCES public.internal_structures(internal_structure_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: internal_assignments internal_assignments_permission_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_assignments
    ADD CONSTRAINT internal_assignments_permission_group_id_fkey FOREIGN KEY (permission_group_id) REFERENCES public.permission_groups(permission_group_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: internal_assignments internal_assignments_plan_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_assignments
    ADD CONSTRAINT internal_assignments_plan_node_id_fkey FOREIGN KEY (plan_node_id) REFERENCES public.plan_nodes(plan_node_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: internal_assignments internal_assignments_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_assignments
    ADD CONSTRAINT internal_assignments_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: internal_assignments internal_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_assignments
    ADD CONSTRAINT internal_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: internal_structure_permission_groups internal_structure_permission_groups_internal_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_structure_permission_groups
    ADD CONSTRAINT internal_structure_permission_groups_internal_structure_id_fkey FOREIGN KEY (internal_structure_id) REFERENCES public.internal_structures(internal_structure_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: internal_structure_permission_groups internal_structure_permission_groups_permission_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_structure_permission_groups
    ADD CONSTRAINT internal_structure_permission_groups_permission_group_id_fkey FOREIGN KEY (permission_group_id) REFERENCES public.permission_groups(permission_group_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: internal_structures internal_structures_government_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_structures
    ADD CONSTRAINT internal_structures_government_structure_id_fkey FOREIGN KEY (government_structure_id) REFERENCES public.government_structures(government_structure_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: internal_structures internal_structures_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_structures
    ADD CONSTRAINT internal_structures_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.internal_structures(internal_structure_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: issue_attachments issue_attachments_attachment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_attachments
    ADD CONSTRAINT issue_attachments_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.attachments(attachment_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: issue_attachments issue_attachments_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_attachments
    ADD CONSTRAINT issue_attachments_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(issue_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: issue_categories issue_categories_parent_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_categories
    ADD CONSTRAINT issue_categories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES public.issue_categories(issue_category_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: issue_form_responses issue_form_responses_form_config_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_form_responses
    ADD CONSTRAINT issue_form_responses_form_config_field_id_fkey FOREIGN KEY (form_config_field_id) REFERENCES public.form_config_fields(form_config_field_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: issue_form_responses issue_form_responses_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_form_responses
    ADD CONSTRAINT issue_form_responses_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(issue_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: issue_histories issue_histories_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_histories
    ADD CONSTRAINT issue_histories_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.issues(issue_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: issue_histories issue_histories_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_histories
    ADD CONSTRAINT issue_histories_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: issues issues_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: issues issues_form_config_container_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_form_config_container_id_fkey FOREIGN KEY (form_config_container_id) REFERENCES public.form_config_containers(form_config_container_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: issues issues_issue_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_issue_category_id_fkey FOREIGN KEY (issue_category_id) REFERENCES public.issue_categories(issue_category_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: issues issues_issue_priority_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_issue_priority_id_fkey FOREIGN KEY (issue_priority_id) REFERENCES public.issue_priorities(issue_priority_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: issues issues_issue_priority_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_issue_priority_id_fkey1 FOREIGN KEY (issue_priority_id) REFERENCES public.issue_priorities(issue_priority_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: issues issues_raised_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_raised_by_fkey FOREIGN KEY (raised_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: issues issues_review_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_review_snapshot_id_fkey FOREIGN KEY (review_snapshot_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: note_attachments note_attachments_attachment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_attachments
    ADD CONSTRAINT note_attachments_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES public.attachments(attachment_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: note_attachments note_attachments_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_attachments
    ADD CONSTRAINT note_attachments_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(note_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: notes notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: notes notes_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: notifications notifications_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: permission_group_permissions permission_group_permissions_permission_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_group_permissions
    ADD CONSTRAINT permission_group_permissions_permission_group_id_fkey FOREIGN KEY (permission_group_id) REFERENCES public.permission_groups(permission_group_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: permission_group_permissions permission_group_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_group_permissions
    ADD CONSTRAINT permission_group_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: plan_amendment_actions plan_amendment_actions_plan_amendment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_amendment_actions
    ADD CONSTRAINT plan_amendment_actions_plan_amendment_id_fkey FOREIGN KEY (plan_amendment_id) REFERENCES public.plan_amendments(plan_amendment_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: plan_amendment_histories plan_amendment_histories_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_amendment_histories
    ADD CONSTRAINT plan_amendment_histories_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: plan_amendment_histories plan_amendment_histories_plan_amendment_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_amendment_histories
    ADD CONSTRAINT plan_amendment_histories_plan_amendment_action_id_fkey FOREIGN KEY (plan_amendment_action_id) REFERENCES public.plan_amendment_actions(plan_amendment_action_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_amendment_histories plan_amendment_histories_plan_amendment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_amendment_histories
    ADD CONSTRAINT plan_amendment_histories_plan_amendment_id_fkey FOREIGN KEY (plan_amendment_id) REFERENCES public.plan_amendments(plan_amendment_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: plan_amendments plan_amendments_compensates_amendment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_amendments
    ADD CONSTRAINT plan_amendments_compensates_amendment_id_fkey FOREIGN KEY (compensates_amendment_id) REFERENCES public.plan_amendments(plan_amendment_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_amendments plan_amendments_master_plan_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_amendments
    ADD CONSTRAINT plan_amendments_master_plan_version_id_fkey FOREIGN KEY (master_plan_version_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: plan_amendments plan_amendments_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_amendments
    ADD CONSTRAINT plan_amendments_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: plan_amendments plan_amendments_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_amendments
    ADD CONSTRAINT plan_amendments_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_node_action_logs plan_node_action_logs_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_node_action_logs
    ADD CONSTRAINT plan_node_action_logs_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.plan_assignment_actions(assignment_action_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: plan_node_action_logs plan_node_action_logs_plan_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_node_action_logs
    ADD CONSTRAINT plan_node_action_logs_plan_node_id_fkey FOREIGN KEY (plan_node_id) REFERENCES public.plan_nodes(plan_node_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: plan_node_action_logs plan_node_action_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_node_action_logs
    ADD CONSTRAINT plan_node_action_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: plan_nodes plan_nodes_annual_actual_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_nodes
    ADD CONSTRAINT plan_nodes_annual_actual_approved_by_fkey FOREIGN KEY (annual_actual_approved_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_nodes plan_nodes_annual_actual_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_nodes
    ADD CONSTRAINT plan_nodes_annual_actual_submitted_by_fkey FOREIGN KEY (annual_actual_submitted_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_nodes plan_nodes_annual_actual_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_nodes
    ADD CONSTRAINT plan_nodes_annual_actual_validated_by_fkey FOREIGN KEY (annual_actual_validated_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_nodes plan_nodes_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_nodes
    ADD CONSTRAINT plan_nodes_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.plan_nodes(plan_node_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: plan_nodes plan_nodes_period_actual_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_nodes
    ADD CONSTRAINT plan_nodes_period_actual_approved_by_fkey FOREIGN KEY (period_actual_approved_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_nodes plan_nodes_period_actual_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_nodes
    ADD CONSTRAINT plan_nodes_period_actual_submitted_by_fkey FOREIGN KEY (period_actual_submitted_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_nodes plan_nodes_period_actual_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_nodes
    ADD CONSTRAINT plan_nodes_period_actual_validated_by_fkey FOREIGN KEY (period_actual_validated_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_nodes plan_nodes_plan_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_nodes
    ADD CONSTRAINT plan_nodes_plan_version_id_fkey FOREIGN KEY (plan_version_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: plan_nodes plan_nodes_source_plan_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_nodes
    ADD CONSTRAINT plan_nodes_source_plan_node_id_fkey FOREIGN KEY (source_plan_node_id) REFERENCES public.plan_nodes(plan_node_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_period_target_baselines plan_period_target_baselines_annual_kpi_plan_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_period_target_baselines
    ADD CONSTRAINT plan_period_target_baselines_annual_kpi_plan_node_id_fkey FOREIGN KEY (annual_kpi_plan_node_id) REFERENCES public.plan_nodes(plan_node_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: plan_period_target_baselines plan_period_target_baselines_annual_plan_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_period_target_baselines
    ADD CONSTRAINT plan_period_target_baselines_annual_plan_version_id_fkey FOREIGN KEY (annual_plan_version_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: plan_period_target_baselines plan_period_target_baselines_execution_snapshot_root_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_period_target_baselines
    ADD CONSTRAINT plan_period_target_baselines_execution_snapshot_root_id_fkey FOREIGN KEY (execution_snapshot_root_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: plan_period_target_baselines plan_period_target_baselines_master_plan_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_period_target_baselines
    ADD CONSTRAINT plan_period_target_baselines_master_plan_version_id_fkey FOREIGN KEY (master_plan_version_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: plan_period_target_baselines plan_period_target_baselines_period_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_period_target_baselines
    ADD CONSTRAINT plan_period_target_baselines_period_version_id_fkey FOREIGN KEY (period_version_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: plan_period_target_baselines plan_period_target_baselines_snapshot_period_plan_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_period_target_baselines
    ADD CONSTRAINT plan_period_target_baselines_snapshot_period_plan_node_id_fkey FOREIGN KEY (snapshot_period_plan_node_id) REFERENCES public.plan_nodes(plan_node_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: plan_rule_steps plan_rule_steps_plan_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_rule_steps
    ADD CONSTRAINT plan_rule_steps_plan_rule_id_fkey FOREIGN KEY (plan_rule_id) REFERENCES public.plan_rules(plan_rule_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: plan_rules plan_rules_government_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_rules
    ADD CONSTRAINT plan_rules_government_structure_id_fkey FOREIGN KEY (government_structure_id) REFERENCES public.government_structures(government_structure_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_rules plan_rules_owned_by_plan_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_rules
    ADD CONSTRAINT plan_rules_owned_by_plan_version_id_fkey FOREIGN KEY (owned_by_plan_version_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: plan_rules plan_rules_source_plan_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_rules
    ADD CONSTRAINT plan_rules_source_plan_rule_id_fkey FOREIGN KEY (source_plan_rule_id) REFERENCES public.plan_rules(plan_rule_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_sector_aggregation_publishes plan_sector_aggregation_publishes_external_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_sector_aggregation_publishes
    ADD CONSTRAINT plan_sector_aggregation_publishes_external_assignment_id_fkey FOREIGN KEY (external_assignment_id) REFERENCES public.external_assignments(external_assignment_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: plan_sector_aggregation_publishes plan_sector_aggregation_publishes_government_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_sector_aggregation_publishes
    ADD CONSTRAINT plan_sector_aggregation_publishes_government_structure_id_fkey FOREIGN KEY (government_structure_id) REFERENCES public.government_structures(government_structure_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: plan_sector_aggregation_publishes plan_sector_aggregation_publishes_plan_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_sector_aggregation_publishes
    ADD CONSTRAINT plan_sector_aggregation_publishes_plan_version_id_fkey FOREIGN KEY (plan_version_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: plan_sector_aggregation_publishes plan_sector_aggregation_publishes_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_sector_aggregation_publishes
    ADD CONSTRAINT plan_sector_aggregation_publishes_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_versions plan_versions_active_execution_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_versions
    ADD CONSTRAINT plan_versions_active_execution_snapshot_id_fkey FOREIGN KEY (active_execution_snapshot_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_versions plan_versions_active_review_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_versions
    ADD CONSTRAINT plan_versions_active_review_snapshot_id_fkey FOREIGN KEY (active_review_snapshot_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_versions plan_versions_based_on_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_versions
    ADD CONSTRAINT plan_versions_based_on_version_id_fkey FOREIGN KEY (based_on_version_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_versions plan_versions_execution_snapshot_of_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_versions
    ADD CONSTRAINT plan_versions_execution_snapshot_of_version_id_fkey FOREIGN KEY (execution_snapshot_of_version_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_versions plan_versions_execution_snapshot_root_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_versions
    ADD CONSTRAINT plan_versions_execution_snapshot_root_id_fkey FOREIGN KEY (execution_snapshot_root_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_versions plan_versions_government_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_versions
    ADD CONSTRAINT plan_versions_government_structure_id_fkey FOREIGN KEY (government_structure_id) REFERENCES public.government_structures(government_structure_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: plan_versions plan_versions_parent_plan_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_versions
    ADD CONSTRAINT plan_versions_parent_plan_version_id_fkey FOREIGN KEY (parent_plan_version_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: plan_versions plan_versions_plan_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_versions
    ADD CONSTRAINT plan_versions_plan_rule_id_fkey FOREIGN KEY (plan_rule_id) REFERENCES public.plan_rules(plan_rule_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_versions plan_versions_planning_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_versions
    ADD CONSTRAINT plan_versions_planning_configuration_id_fkey FOREIGN KEY (planning_configuration_id) REFERENCES public.planning_configurations(planning_configuration_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_versions plan_versions_review_snapshot_of_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_versions
    ADD CONSTRAINT plan_versions_review_snapshot_of_version_id_fkey FOREIGN KEY (review_snapshot_of_version_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: plan_versions plan_versions_review_snapshot_root_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_versions
    ADD CONSTRAINT plan_versions_review_snapshot_root_id_fkey FOREIGN KEY (review_snapshot_root_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: planning_configurations planning_configurations_government_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_configurations
    ADD CONSTRAINT planning_configurations_government_structure_id_fkey FOREIGN KEY (government_structure_id) REFERENCES public.government_structures(government_structure_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: planning_configurations planning_configurations_owned_by_plan_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_configurations
    ADD CONSTRAINT planning_configurations_owned_by_plan_version_id_fkey FOREIGN KEY (owned_by_plan_version_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: planning_configurations planning_configurations_source_planning_configuration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_configurations
    ADD CONSTRAINT planning_configurations_source_planning_configuration_id_fkey FOREIGN KEY (source_planning_configuration_id) REFERENCES public.planning_configurations(planning_configuration_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(permission_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: roles roles_government_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_government_structure_id_fkey FOREIGN KEY (government_structure_id) REFERENCES public.government_structures(government_structure_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: system_audit_logs system_audit_logs_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_audit_logs
    ADD CONSTRAINT system_audit_logs_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: target_allocation_histories target_allocation_histories_annual_kpi_plan_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_allocation_histories
    ADD CONSTRAINT target_allocation_histories_annual_kpi_plan_node_id_fkey FOREIGN KEY (annual_kpi_plan_node_id) REFERENCES public.plan_nodes(plan_node_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: target_allocation_histories target_allocation_histories_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_allocation_histories
    ADD CONSTRAINT target_allocation_histories_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: target_allocation_histories target_allocation_histories_master_plan_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_allocation_histories
    ADD CONSTRAINT target_allocation_histories_master_plan_version_id_fkey FOREIGN KEY (master_plan_version_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: target_allocation_histories target_allocation_histories_period_plan_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_allocation_histories
    ADD CONSTRAINT target_allocation_histories_period_plan_node_id_fkey FOREIGN KEY (period_plan_node_id) REFERENCES public.plan_nodes(plan_node_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: target_allocation_histories target_allocation_histories_period_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_allocation_histories
    ADD CONSTRAINT target_allocation_histories_period_version_id_fkey FOREIGN KEY (period_version_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: target_allocation_histories target_allocation_histories_reference_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_allocation_histories
    ADD CONSTRAINT target_allocation_histories_reference_id_fkey FOREIGN KEY (reference_id) REFERENCES public.target_reallocation_requests(target_reallocation_request_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: target_reallocation_requests target_reallocation_requests_annual_kpi_plan_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_reallocation_requests
    ADD CONSTRAINT target_reallocation_requests_annual_kpi_plan_node_id_fkey FOREIGN KEY (annual_kpi_plan_node_id) REFERENCES public.plan_nodes(plan_node_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: target_reallocation_requests target_reallocation_requests_annual_plan_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_reallocation_requests
    ADD CONSTRAINT target_reallocation_requests_annual_plan_version_id_fkey FOREIGN KEY (annual_plan_version_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: target_reallocation_requests target_reallocation_requests_execution_snapshot_root_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_reallocation_requests
    ADD CONSTRAINT target_reallocation_requests_execution_snapshot_root_id_fkey FOREIGN KEY (execution_snapshot_root_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: target_reallocation_requests target_reallocation_requests_from_period_plan_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_reallocation_requests
    ADD CONSTRAINT target_reallocation_requests_from_period_plan_node_id_fkey FOREIGN KEY (from_period_plan_node_id) REFERENCES public.plan_nodes(plan_node_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: target_reallocation_requests target_reallocation_requests_from_period_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_reallocation_requests
    ADD CONSTRAINT target_reallocation_requests_from_period_version_id_fkey FOREIGN KEY (from_period_version_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: target_reallocation_requests target_reallocation_requests_master_plan_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_reallocation_requests
    ADD CONSTRAINT target_reallocation_requests_master_plan_version_id_fkey FOREIGN KEY (master_plan_version_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: target_reallocation_requests target_reallocation_requests_plan_amendment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_reallocation_requests
    ADD CONSTRAINT target_reallocation_requests_plan_amendment_id_fkey FOREIGN KEY (plan_amendment_id) REFERENCES public.plan_amendments(plan_amendment_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: target_reallocation_requests target_reallocation_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_reallocation_requests
    ADD CONSTRAINT target_reallocation_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: target_reallocation_requests target_reallocation_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_reallocation_requests
    ADD CONSTRAINT target_reallocation_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: target_reallocation_requests target_reallocation_requests_to_period_plan_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_reallocation_requests
    ADD CONSTRAINT target_reallocation_requests_to_period_plan_node_id_fkey FOREIGN KEY (to_period_plan_node_id) REFERENCES public.plan_nodes(plan_node_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: target_reallocation_requests target_reallocation_requests_to_period_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_reallocation_requests
    ADD CONSTRAINT target_reallocation_requests_to_period_version_id_fkey FOREIGN KEY (to_period_version_id) REFERENCES public.plan_versions(plan_version_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: user_permission_groups user_permission_groups_permission_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permission_groups
    ADD CONSTRAINT user_permission_groups_permission_group_id_fkey FOREIGN KEY (permission_group_id) REFERENCES public.permission_groups(permission_group_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: user_permission_groups user_permission_groups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permission_groups
    ADD CONSTRAINT user_permission_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: users users_government_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_government_structure_id_fkey FOREIGN KEY (government_structure_id) REFERENCES public.government_structures(government_structure_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: users users_internal_structure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_internal_structure_id_fkey FOREIGN KEY (internal_structure_id) REFERENCES public.internal_structures(internal_structure_id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- PostgreSQL database dump complete
--
