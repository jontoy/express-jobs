PGDMP     7
1                x        
   jobly-test    12.3    12.3 )    �           0    0    ENCODING    ENCODING
SET client_encoding
= 'UTF8';
                      false            �           0    0 
   STDSTRINGS 
   STDSTRINGS
(
SET standard_conforming_strings
= 'on';
                      false            �           0    0 
   SEARCHPATH 
   SEARCHPATH     8
SELECT pg_catalog.set_config('search_path', '', false);
false            �           1262    21930 
   jobly-test    DATABASE     ~
CREATE DATABASE "jobly-test" WITH TEMPLATE = template0
ENCODING = 'UTF8' LC_COLLATE = 'en_US.UTF-8' LC_CTYPE = 'en_US.UTF-8';
DROP DATABASE "jobly-test";
jonathantoy    false            �           1247    22124    state    TYPE     f
CREATE TYPE public.state AS ENUM
(
    'interested',
    'applied',
    'accepted',
    'rejected'
);
DROP TYPE public.state;
       public          jonathantoy    false            �            1259    21931    applications    TABLE     �
CREATE TABLE public.applications
(
    username text NOT NULL,
    job_id integer NOT NULL,
    created_at timestamp
    without time zone DEFAULT CURRENT_TIMESTAMP,
    state public.state
);
    DROP TABLE public.applications;
    public         heap    jonathantoy    false    646            �            1259    21938 	   companies    TABLE     �
    CREATE TABLE public.companies
    (
        handle text NOT NULL,
        name text NOT NULL,
        num_employees integer,
        description text,
        logo_url text
    );
    DROP TABLE public.companies;
    public         heap    jonathantoy    false            �            1259    21944    jobs    TABLE     @
    CREATE TABLE public.jobs
    (
        id integer NOT NULL,
        title text NOT NULL,
        salary double precision,
        equity double precision,
        company_handle text NOT NULL,
        date_posted timestamp
        without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT jobs_equity_check CHECK
        ((equity <=
        (1.0)::double precision))
);
        DROP TABLE public.jobs;
        public         heap    jonathantoy    false            �            1259    21951    jobs_id_seq    SEQUENCE     �
        CREATE SEQUENCE public.jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
        "   DROP SEQUENCE public.jobs_id_seq;
       public          jonathantoy    false    204            �           0    0    jobs_id_seq    SEQUENCE OWNED BY     ;   ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;
          public          jonathantoy    false    205            �            1259    22229    jobs_technologies    TABLE     Y   CREATE TABLE public.jobs_technologies (
    job_id integer,
    technology_id integer
);
 %   DROP TABLE public.jobs_technologies;
       public         heap    jonathantoy    false            �            1259    22205    technologies    TABLE     g   CREATE TABLE public.technologies (
    id integer NOT NULL,
    name character varying(80) NOT NULL
);
     DROP TABLE public.technologies;
       public         heap    jonathantoy    false            �            1259    22203    technologies_id_seq    SEQUENCE     �   CREATE SEQUENCE public.technologies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 *   DROP SEQUENCE public.technologies_id_seq;
       public          jonathantoy    false    208            �           0    0    technologies_id_seq    SEQUENCE OWNED BY     K   ALTER SEQUENCE public.technologies_id_seq OWNED BY public.technologies.id;
          public          jonathantoy    false    207            �            1259    21953    users    TABLE     �   CREATE TABLE public.users (
    username text NOT NULL,
    password text NOT NULL,
    first_name text,
    last_name text,
    email text,
    photo_url text,
    is_admin boolean DEFAULT false NOT NULL
);
    DROP TABLE public.users;
       public         heap    jonathantoy    false            �            1259    22213    users_technologies    TABLE     Y   CREATE TABLE public.users_technologies (
    username text,
    technology_id integer
);
 &   DROP TABLE public.users_technologies;
       public         heap    jonathantoy    false                       2604    21986    jobs id    DEFAULT     b   ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);
 6   ALTER TABLE public.jobs ALTER COLUMN id DROP DEFAULT;
       public          jonathantoy    false    205    204                       2604    22208    technologies id    DEFAULT     r   ALTER TABLE ONLY public.technologies ALTER COLUMN id SET DEFAULT nextval('public.technologies_id_seq'::regclass);
 >   ALTER TABLE public.technologies ALTER COLUMN id DROP DEFAULT;
       public          jonathantoy    false    208    207    208            �          0    21931    applications 
   TABLE DATA           K   COPY public.applications (username, job_id, created_at, state) FROM stdin;
    public          jonathantoy    false    202   �/       �          0    21938 	   companies 
   TABLE DATA           W   COPY public.companies (handle, name, num_employees, description, logo_url) FROM stdin;
    public          jonathantoy    false    203   �/       �          0    21944    jobs 
   TABLE DATA           V   COPY public.jobs (id, title, salary, equity, company_handle, date_posted) FROM stdin;
    public          jonathantoy    false    204   0       �          0    22229    jobs_technologies 
   TABLE DATA           B   COPY public.jobs_technologies (job_id, technology_id) FROM stdin;
    public          jonathantoy    false    210   "0       �          0    22205    technologies 
   TABLE DATA           0   COPY public.technologies
        (id, name) FROM stdin;
    public          jonathantoy    false    208   ?0       �          0    21953    users 
   TABLE DATA           f   COPY public.users
        (username, password, first_name, last_name, email, photo_url, is_admin) FROM stdin;
    public          jonathantoy    false    206   \0       �          0    22213    users_technologies 
   TABLE DATA           E   COPY public.users_technologies
        (username, technology_id) FROM stdin;
    public          jonathantoy    false    209   y0       �           0    0    jobs_id_seq    SEQUENCE
        SET
        <
        SELECT pg_catalog.setval('public.jobs_id_seq', 2296, true);
        public          jonathantoy    false    205            �           0    0    technologies_id_seq    SEQUENCE
        SET     B
        SELECT pg_catalog.setval('public.technologies_id_seq', 1, false);
        public          jonathantoy    false    207                       2606    21962    applications applications_pkey 
   CONSTRAINT     j
        ALTER TABLE ONLY public.applications
        ADD CONSTRAINT applications_pkey PRIMARY KEY
        (username, job_id);
 H
        ALTER TABLE ONLY public.applications
        DROP CONSTRAINT applications_pkey;
       public            jonathantoy    false    202    202                       2606    21964    companies companies_name_key 
   CONSTRAINT     W
        ALTER TABLE ONLY public.companies
        ADD CONSTRAINT companies_name_key UNIQUE
        (name);
 F
        ALTER TABLE ONLY public.companies
        DROP CONSTRAINT companies_name_key;
       public            jonathantoy    false    203                        2606    21966    companies companies_pkey 
   CONSTRAINT     Z
        ALTER TABLE ONLY public.companies
        ADD CONSTRAINT companies_pkey PRIMARY KEY
        (handle);
 B
        ALTER TABLE ONLY public.companies
        DROP CONSTRAINT companies_pkey;
       public            jonathantoy    false    203            "           2606    21968    jobs jobs_pkey 
   CONSTRAINT     L   ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);
 8   ALTER TABLE ONLY public.jobs DROP CONSTRAINT jobs_pkey;
       public            jonathantoy    false    204            &           2606    22212 "   technologies technologies_name_key 
   CONSTRAINT     ]
        ALTER TABLE ONLY public.technologies
        ADD CONSTRAINT technologies_name_key UNIQUE
        (name);
 L
        ALTER TABLE ONLY public.technologies
        DROP CONSTRAINT technologies_name_key;
       public            jonathantoy    false    208
        (           2606    22210    technologies technologies_pkey 
   CONSTRAINT     \
        ALTER TABLE ONLY public.technologies
        ADD CONSTRAINT technologies_pkey PRIMARY KEY
        (id);
 H
        ALTER TABLE ONLY public.technologies
        DROP CONSTRAINT technologies_pkey;
       public            jonathantoy    false    208            $           2606    21970    users users_pkey 
   CONSTRAINT     T
        ALTER TABLE ONLY public.users
        ADD CONSTRAINT users_pkey PRIMARY KEY
        (username);
 :
        ALTER TABLE ONLY public.users
        DROP CONSTRAINT users_pkey;
       public            jonathantoy    false    206            )           2606    21971 %   applications applications_job_id_fkey 
   FK CONSTRAINT     �
        ALTER TABLE ONLY public.applications
        ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY
        (job_id) REFERENCES public.jobs
        (id) ON
        DELETE CASCADE;
        O
        ALTER TABLE ONLY public.applications
        DROP CONSTRAINT applications_job_id_fkey;
       public          jonathantoy    false    3106    202    204            *           2606    21976 '   applications applications_username_fkey 
   FK CONSTRAINT     �   ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_username_fkey FOREIGN KEY (username) REFERENCES public.users(username) ON DELETE CASCADE;
 Q   ALTER TABLE ONLY public.applications DROP CONSTRAINT applications_username_fkey;
       public          jonathantoy    false    206    3108    202            .           2606    22232    jobs_technologies fk_job 
   FK CONSTRAINT     u   ALTER TABLE ONLY public.jobs_technologies
    ADD CONSTRAINT fk_job FOREIGN KEY (job_id) REFERENCES public.jobs(id);
 B   ALTER TABLE ONLY public.jobs_technologies DROP CONSTRAINT fk_job;
       public          jonathantoy    false    210    3106    204            -           2606    22224     users_technologies fk_technology 
   FK CONSTRAINT     �   ALTER TABLE ONLY public.users_technologies
    ADD CONSTRAINT fk_technology FOREIGN KEY (technology_id) REFERENCES public.technologies(id);
 J   ALTER TABLE ONLY public.users_technologies DROP CONSTRAINT fk_technology;
       public          jonathantoy    false    208    209    3112            /           2606    22237    jobs_technologies fk_technology 
   FK CONSTRAINT     �   ALTER TABLE ONLY public.jobs_technologies
    ADD CONSTRAINT fk_technology FOREIGN KEY (technology_id) REFERENCES public.technologies(id);
 I   ALTER TABLE ONLY public.jobs_technologies DROP CONSTRAINT fk_technology;
       public          jonathantoy    false    3112    210    208            ,           2606    22219    users_technologies fk_user 
   FK CONSTRAINT     �   ALTER TABLE ONLY public.users_technologies
    ADD CONSTRAINT fk_user FOREIGN KEY (username) REFERENCES public.users(username);
 D   ALTER TABLE ONLY public.users_technologies DROP CONSTRAINT fk_user;
       public          jonathantoy    false    206    209    3108            +           2606    21981    jobs jobs_company_handle_fkey 
   FK CONSTRAINT     �   ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_company_handle_fkey FOREIGN KEY (company_handle) REFERENCES public.companies(handle) ON DELETE CASCADE;
 G   ALTER TABLE ONLY public.jobs DROP CONSTRAINT jobs_company_handle_fkey;
       public          jonathantoy    false    3104    203    204            �   
   x������ � �      �   
   x������ � �      �   
   x������ � �      �   
   x������ � �      �   
   x������ � �      �   
   x������ � �      �   
   x������ � �     