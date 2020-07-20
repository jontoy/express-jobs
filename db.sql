--
-- PostgreSQL database dump
--

-- Dumped from database version 12.3
-- Dumped by pg_dump version 12.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: jonathantoy
--

CREATE TABLE public.applications (
    username text NOT NULL,
    job_id integer NOT NULL,
    state text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.applications OWNER TO jonathantoy;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: jonathantoy
--

CREATE TABLE public.companies (
    handle text NOT NULL,
    name text NOT NULL,
    num_employees integer,
    description text,
    logo_url text
);


ALTER TABLE public.companies OWNER TO jonathantoy;

--
-- Name: jobs; Type: TABLE; Schema: public; Owner: jonathantoy
--

CREATE TABLE public.jobs (
    id integer NOT NULL,
    title text NOT NULL,
    salary double precision,
    equity double precision,
    company_handle text NOT NULL,
    date_posted timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT jobs_equity_check CHECK ((equity <= (1.0)::double precision))
);


ALTER TABLE public.jobs OWNER TO jonathantoy;

--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: jonathantoy
--

CREATE SEQUENCE public.jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.jobs_id_seq OWNER TO jonathantoy;

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jonathantoy
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: jonathantoy
--

CREATE TABLE public.users (
    username text NOT NULL,
    password text NOT NULL,
    first_name text,
    last_name text,
    email text,
    photo_url text,
    is_admin boolean DEFAULT false NOT NULL
);


ALTER TABLE public.users OWNER TO jonathantoy;

--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: jonathantoy
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Data for Name: applications; Type: TABLE DATA; Schema: public; Owner: jonathantoy
--

COPY public.applications (username, job_id, state, created_at) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: jonathantoy
--

COPY public.companies (handle, name, num_employees, description, logo_url) FROM stdin;
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: jonathantoy
--

COPY public.jobs (id, title, salary, equity, company_handle, date_posted) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: jonathantoy
--

COPY public.users (username, password, first_name, last_name, email, photo_url, is_admin) FROM stdin;
\.


--
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: jonathantoy
--

SELECT pg_catalog.setval('public.jobs_id_seq', 436, true);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: jonathantoy
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (username, job_id);


--
-- Name: companies companies_name_key; Type: CONSTRAINT; Schema: public; Owner: jonathantoy
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_name_key UNIQUE (name);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: jonathantoy
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (handle);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: jonathantoy
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: jonathantoy
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (username);


--
-- Name: applications applications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jonathantoy
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: applications applications_username_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jonathantoy
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_username_fkey FOREIGN KEY (username) REFERENCES public.users(username) ON DELETE CASCADE;


--
-- Name: jobs jobs_company_handle_fkey; Type: FK CONSTRAINT; Schema: public; Owner: jonathantoy
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_company_handle_fkey FOREIGN KEY (company_handle) REFERENCES public.companies(handle) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

