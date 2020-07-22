--
-- PostgreSQL database dump
--
-- Dumped from database version 10.5
-- Dumped by pg_dump version 10.5

SET statement_timeout = 0;

SET lock_timeout = 0;

SET idle_in_transaction_session_timeout = 0;

SET client_encoding = 'UTF8';

SET standard_conforming_strings = ON;

SELECT
    pg_catalog.set_config('search_path', '', FALSE);

SET check_function_bodies = FALSE;

SET client_min_messages = warning;

SET row_security = OFF;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner:
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;

--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';

SET default_tablespace = '';

SET default_with_oids = FALSE;

CREATE TYPE public.state AS ENUM (
    'interested',
    'applied',
    'accepted',
    'rejected'
);

CREATE TABLE public.users (
    username text PRIMARY KEY,
    password text NOT NULL,
    first_name text,
    last_name text,
    email text,
    photo_url text,
    is_admin boolean DEFAULT FALSE NOT NULL
);

CREATE TABLE public.companies (
    handle text PRIMARY KEY,
    name text NOT NULL,
    num_employees integer,
    description text,
    logo_url text
);

CREATE TABLE public.jobs (
    id serial PRIMARY KEY,
    title text NOT NULL,
    salary double precision,
    equity double precision,
    company_handle text NOT NULL,
    date_posted timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT jobs_equity_check CHECK ((equity <= (1.0)::double precision)),
    CONSTRAINT jobs_company_handle_fkey FOREIGN KEY (company_handle) REFERENCES public.companies (handle) ON DELETE CASCADE
);

CREATE TABLE public.applications (
    username text NOT NULL,
    job_id integer NOT NULL,
    state public.state NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT applications_pkey PRIMARY KEY (username, job_id),
    CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs (id) ON DELETE CASCADE,
    CONSTRAINT applications_username_fkey FOREIGN KEY (username) REFERENCES public.users (username) ON DELETE CASCADE
);

CREATE TABLE public.technologies (
    id serial PRIMARY KEY,
    name text NOT NULL
);

CREATE TABLE public.jobs_technologies (
    job_id integer,
    technology_id integer,
    CONSTRAINT fk_jobs_jt FOREIGN KEY (job_id) REFERENCES public.jobs (id) ON DELETE CASCADE,
    CONSTRAINT fk_tech_jt FOREIGN KEY (technology_id) REFERENCES public.technologies (id) ON DELETE CASCADE
);

CREATE TABLE public.users_technologies (
    username text,
    technology_id integer,
    CONSTRAINT fk_users_ut FOREIGN KEY (username) REFERENCES public.users (username) ON DELETE CASCADE,
    CONSTRAINT fk_tech_ut FOREIGN KEY (technology_id) REFERENCES public.technologies (id) ON DELETE CASCADE
);

--
-- PostgreSQL database dump complete
--
