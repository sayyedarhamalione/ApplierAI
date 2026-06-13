-- supabase/seed/001_companies.sql
-- 75 curated companies. Run once after migrations.
-- tier 1 = MNC (hardcoded, scrape-primary), tier 2 = Apify discovery, tier 3 = crawler
-- All tier-1 companies here. Tier 2/3 populated by scraper at runtime.
-- ATS slugs: verify against actual Greenhouse/Lever/Ashby board URLs before prod.

INSERT INTO companies (name, slug, ats_type, website, employee_band, is_mnc, tier, hq_city, hq_country, is_remote_first, cities) VALUES

-- ── Global Remote-First (Greenhouse) ─────────────────────────────────────────
('Stripe',         'stripe',         'greenhouse', 'https://stripe.com',         '1k-10k',  true,  1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco', 'Dublin', 'Bangalore']),
('Notion',         'notion',         'greenhouse', 'https://notion.so',           '50-500',  false, 1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco', 'New York']),
('Linear',         'linear',         'ashby',      'https://linear.app',          '11-50',   false, 1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco']),
('Vercel',         'vercel',         'greenhouse', 'https://vercel.com',          '50-500',  false, 1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco']),
('Supabase',       'supabase',       'ashby',      'https://supabase.com',        '50-500',  false, 1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco']),
('Figma',          'figma',          'greenhouse', 'https://figma.com',           '1k-10k',  false, 1, 'San Francisco', 'USA',     false, ARRAY['San Francisco', 'New York', 'London']),
('Airbnb',         'airbnb',         'greenhouse', 'https://airbnb.com',          '10k-1L',  true,  1, 'San Francisco', 'USA',     false, ARRAY['San Francisco', 'Bangalore']),
('Cloudflare',     'cloudflare',     'greenhouse', 'https://cloudflare.com',      '1k-10k',  true,  1, 'San Francisco', 'USA',     false, ARRAY['San Francisco', 'Austin', 'London', 'Bangalore']),
('HashiCorp',      'hashicorp',      'greenhouse', 'https://hashicorp.com',       '1k-10k',  false, 1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco']),
('Datadog',        'datadog',        'greenhouse', 'https://datadoghq.com',       '1k-10k',  true,  1, 'New York',      'USA',     false, ARRAY['New York', 'Paris', 'Bangalore']),
('MongoDB',        'mongodb',        'greenhouse', 'https://mongodb.com',         '1k-10k',  true,  1, 'New York',      'USA',     false, ARRAY['New York', 'Bangalore', 'Dublin']),
('Twilio',         'twilio',         'greenhouse', 'https://twilio.com',          '1k-10k',  true,  1, 'San Francisco', 'USA',     false, ARRAY['San Francisco', 'Bangalore']),
('PlanetScale',    'planetscale',    'greenhouse', 'https://planetscale.com',     '50-500',  false, 1, 'San Mateo',     'USA',     true,  ARRAY['San Mateo']),
('Fly.io',         'fly',            'lever',      'https://fly.io',              '11-50',   false, 1, 'Chicago',       'USA',     true,  ARRAY['Chicago']),
('Railway',        'railway',        'ashby',      'https://railway.app',         '11-50',   false, 1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco']),
('Resend',         'resend',         'ashby',      'https://resend.com',          '11-50',   false, 1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco']),
('Loops',          'loops',          'ashby',      'https://loops.so',            '11-50',   false, 1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco']),
('Cal.com',        'calcom',         'ashby',      'https://cal.com',             '11-50',   false, 1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco']),
('Prisma',         'prisma',         'lever',      'https://prisma.io',           '50-500',  false, 1, 'Berlin',        'Germany', true,  ARRAY['Berlin']),
('Grafana Labs',   'grafana',        'greenhouse', 'https://grafana.com',         '50-500',  false, 1, 'New York',      'USA',     true,  ARRAY['New York', 'Stockholm']),

-- ── Global Remote-First (Lever) ───────────────────────────────────────────────
('GitLab',         'gitlab',         'lever',      'https://gitlab.com',          '1k-10k',  true,  1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco']),
('Miro',           'miro',           'greenhouse', 'https://miro.com',            '1k-10k',  true,  1, 'San Francisco', 'USA',     false, ARRAY['San Francisco', 'Amsterdam', 'Bangalore']),
('Loom',           'loom',           'greenhouse', 'https://loom.com',            '50-500',  false, 1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco']),
('Retool',         'retool',         'greenhouse', 'https://retool.com',          '50-500',  false, 1, 'San Francisco', 'USA',     false, ARRAY['San Francisco']),
('Temporal',       'temporal',       'greenhouse', 'https://temporal.io',         '50-500',  false, 1, 'Bellevue',      'USA',     true,  ARRAY['Bellevue']),
('Sourcegraph',    'sourcegraph',    'greenhouse', 'https://sourcegraph.com',     '50-500',  false, 1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco']),
('Descript',       'descript',       'greenhouse', 'https://descript.com',        '50-500',  false, 1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco']),
('Oxide Computer', 'oxide',          'lever',      'https://oxide.computer',      '50-500',  false, 1, 'Emeryville',    'USA',     false, ARRAY['Emeryville']),
('Render',         'render',         'lever',      'https://render.com',          '50-500',  false, 1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco']),
('Neon',           'neon',           'ashby',      'https://neon.tech',           '50-500',  false, 1, 'Menlo Park',    'USA',     true,  ARRAY['Menlo Park']),

-- ── Big Tech MNCs (Indian offices) ───────────────────────────────────────────
('Google',         'google',         'greenhouse', 'https://google.com',          '10k-1L',  true,  1, 'Mountain View', 'USA',     false, ARRAY['Mountain View', 'Bangalore', 'Hyderabad', 'Mumbai']),
('Microsoft',      'microsoft',      'lever',      'https://microsoft.com',       '10k-1L',  true,  1, 'Redmond',       'USA',     false, ARRAY['Redmond', 'Bangalore', 'Hyderabad']),
('Amazon',         'amazon',         'greenhouse', 'https://amazon.com',          '10k-1L',  true,  1, 'Seattle',       'USA',     false, ARRAY['Seattle', 'Bangalore', 'Hyderabad', 'Chennai']),
('Meta',           'meta',           'greenhouse', 'https://meta.com',            '10k-1L',  true,  1, 'Menlo Park',    'USA',     false, ARRAY['Menlo Park', 'Bangalore']),
('Apple',          'apple',          'greenhouse', 'https://apple.com',           '10k-1L',  true,  1, 'Cupertino',     'USA',     false, ARRAY['Cupertino', 'Bangalore', 'Hyderabad']),
('Atlassian',      'atlassian',      'greenhouse', 'https://atlassian.com',       '10k-1L',  true,  1, 'Sydney',        'Australia',false,ARRAY['Sydney', 'Bangalore', 'Amsterdam', 'Austin']),
('Salesforce',     'salesforce',     'greenhouse', 'https://salesforce.com',      '10k-1L',  true,  1, 'San Francisco', 'USA',     false, ARRAY['San Francisco', 'Bangalore', 'Hyderabad']),
('Adobe',          'adobe',          'greenhouse', 'https://adobe.com',           '10k-1L',  true,  1, 'San Jose',      'USA',     false, ARRAY['San Jose', 'Bangalore', 'Noida']),
('Oracle',         'oracle',         'greenhouse', 'https://oracle.com',          '10k-1L',  true,  1, 'Austin',        'USA',     false, ARRAY['Austin', 'Bangalore', 'Hyderabad', 'Mumbai']),
('SAP',            'sap',            'greenhouse', 'https://sap.com',             '10k-1L',  true,  1, 'Walldorf',      'Germany', false, ARRAY['Walldorf', 'Bangalore', 'Pune', 'Hyderabad']),
('Cisco',          'cisco',          'greenhouse', 'https://cisco.com',           '10k-1L',  true,  1, 'San Jose',      'USA',     false, ARRAY['San Jose', 'Bangalore', 'Pune']),
('VMware',         'vmware',         'greenhouse', 'https://vmware.com',          '10k-1L',  true,  1, 'Palo Alto',     'USA',     false, ARRAY['Palo Alto', 'Bangalore', 'Pune']),
('ServiceNow',     'servicenow',     'greenhouse', 'https://servicenow.com',      '10k-1L',  true,  1, 'Santa Clara',   'USA',     false, ARRAY['Santa Clara', 'Hyderabad']),
('Qualcomm',       'qualcomm',       'greenhouse', 'https://qualcomm.com',        '10k-1L',  true,  1, 'San Diego',     'USA',     false, ARRAY['San Diego', 'Bangalore', 'Hyderabad', 'Chennai']),
('PayPal',         'paypal',         'greenhouse', 'https://paypal.com',          '10k-1L',  true,  1, 'San Jose',      'USA',     false, ARRAY['San Jose', 'Bangalore', 'Hyderabad', 'Chennai']),

-- ── Fintech / High-Signal MNCs ────────────────────────────────────────────────
('Plaid',          'plaid',          'lever',      'https://plaid.com',           '50-500',  false, 1, 'San Francisco', 'USA',     false, ARRAY['San Francisco', 'New York']),
('Brex',           'brex',           'greenhouse', 'https://brex.com',            '50-500',  false, 1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco']),
('Rippling',       'rippling',       'greenhouse', 'https://rippling.com',        '1k-10k',  false, 1, 'San Francisco', 'USA',     false, ARRAY['San Francisco', 'Bangalore']),
('Deel',           'deel',           'greenhouse', 'https://deel.com',            '1k-10k',  false, 1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco']),
('Remote',         'remote',         'greenhouse', 'https://remote.com',          '50-500',  false, 1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco']),

-- ── AI / ML Companies ─────────────────────────────────────────────────────────
('Anthropic',      'anthropic',      'greenhouse', 'https://anthropic.com',       '50-500',  false, 1, 'San Francisco', 'USA',     false, ARRAY['San Francisco']),
('Hugging Face',   'huggingface',    'lever',      'https://huggingface.co',      '50-500',  false, 1, 'New York',      'USA',     true,  ARRAY['New York', 'Paris']),
('Cohere',         'cohere',         'greenhouse', 'https://cohere.com',          '50-500',  false, 1, 'Toronto',       'Canada',  true,  ARRAY['Toronto', 'London']),
('Mistral AI',     'mistral',        'ashby',      'https://mistral.ai',          '50-500',  false, 1, 'Paris',         'France',  false, ARRAY['Paris']),
('Scale AI',       'scale-ai',       'greenhouse', 'https://scale.com',           '1k-10k',  false, 1, 'San Francisco', 'USA',     false, ARRAY['San Francisco']),
('Weights & Biases','wandb',         'greenhouse', 'https://wandb.ai',            '50-500',  false, 1, 'San Francisco', 'USA',     true,  ARRAY['San Francisco']),

-- ── Indian Tech Layer — Product Companies ────────────────────────────────────
('Razorpay',       'razorpay',       NULL,         'https://razorpay.com',        '1k-10k',  false, 1, 'Bangalore',     'India',   false, ARRAY['Bangalore', 'Mumbai']),
('CRED',           'cred',           NULL,         'https://cred.club',           '50-500',  false, 1, 'Bangalore',     'India',   false, ARRAY['Bangalore']),
('Zerodha',        'zerodha',        NULL,         'https://zerodha.com',         '50-500',  false, 1, 'Bangalore',     'India',   false, ARRAY['Bangalore']),
('Groww',          'groww',          NULL,         'https://groww.in',            '50-500',  false, 1, 'Bangalore',     'India',   false, ARRAY['Bangalore']),
('Meesho',         'meesho',         NULL,         'https://meesho.com',          '1k-10k',  false, 1, 'Bangalore',     'India',   false, ARRAY['Bangalore']),
('PhonePe',        'phonepe',        NULL,         'https://phonepe.com',         '1k-10k',  false, 1, 'Bangalore',     'India',   false, ARRAY['Bangalore']),
('BrowserStack',   'browserstack',   NULL,         'https://browserstack.com',    '1k-10k',  false, 1, 'Mumbai',        'India',   false, ARRAY['Mumbai', 'Bangalore']),
('Postman',        'postman',        'greenhouse', 'https://postman.com',         '50-500',  false, 1, 'San Francisco', 'USA',     false, ARRAY['San Francisco', 'Bangalore']),
('Zomato',         'zomato',         NULL,         'https://zomato.com',          '10k-1L',  true,  1, 'Gurugram',      'India',   false, ARRAY['Gurugram', 'Bangalore', 'Mumbai']),
('Swiggy',         'swiggy',         NULL,         'https://swiggy.com',          '10k-1L',  true,  1, 'Bangalore',     'India',   false, ARRAY['Bangalore', 'Mumbai', 'Hyderabad']),
('Ola',            'ola',            NULL,         'https://olacabs.com',         '10k-1L',  true,  1, 'Bangalore',     'India',   false, ARRAY['Bangalore', 'Hyderabad', 'Chennai']),
('Flipkart',       'flipkart',       NULL,         'https://flipkart.com',        '10k-1L',  true,  1, 'Bangalore',     'India',   false, ARRAY['Bangalore', 'Hyderabad', 'Chennai']),
('Paytm',          'paytm',          NULL,         'https://paytm.com',           '10k-1L',  true,  1, 'Noida',         'India',   false, ARRAY['Noida', 'Bangalore', 'Mumbai']),

-- ── Indian IT Services (MNC, large hiring volume) ────────────────────────────
('Infosys',        'infosys',        NULL,         'https://infosys.com',         '10k-1L',  true,  1, 'Bangalore',     'India',   false, ARRAY['Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Mumbai']),
('Wipro',          'wipro',          NULL,         'https://wipro.com',           '10k-1L',  true,  1, 'Bangalore',     'India',   false, ARRAY['Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Mumbai']),
('TCS',            'tcs',            NULL,         'https://tcs.com',             '10k-1L',  true,  1, 'Mumbai',        'India',   false, ARRAY['Mumbai', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai']),
('HCLTech',        'hcltech',        NULL,         'https://hcltech.com',         '10k-1L',  true,  1, 'Noida',         'India',   false, ARRAY['Noida', 'Bangalore', 'Pune', 'Chennai']),
('Tech Mahindra',  'techmahindra',   NULL,         'https://techmahindra.com',    '10k-1L',  true,  1, 'Pune',          'India',   false, ARRAY['Pune', 'Bangalore', 'Hyderabad', 'Chennai'])

ON CONFLICT (slug) DO NOTHING;

-- Verify count
SELECT COUNT(*) AS total_companies, 
       COUNT(*) FILTER (WHERE ats_type IS NOT NULL) AS ats_companies,
       COUNT(*) FILTER (WHERE is_mnc = true) AS mncs,
       COUNT(*) FILTER (WHERE is_remote_first = true) AS remote_first
FROM companies;