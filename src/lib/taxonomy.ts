// Skill + role taxonomy. Keeps matching "semantic" without an LLM in the loop:
// synonyms collapse to a canonical token, and role families let us recognize
// related titles (Product Analyst ~ Business Intelligence Analyst ~ Decision Scientist).

// canonical skill -> list of surface forms (all lowercased, matched as word-ish)
export const SKILL_SYNONYMS: Record<string, string[]> = {
  python: ["python"],
  sql: ["sql", "mysql", "postgresql", "postgres", "t-sql", "pl/sql"],
  tableau: ["tableau"],
  "power bi": ["power bi", "powerbi", "power-bi"],
  excel: ["excel", "microsoft excel", "spreadsheets"],
  java: ["java"],
  "c/c++": ["c++", "c/c++", " c ", "c programming"],
  javascript: ["javascript", "js", "typescript", "ts"],
  "html/css": ["html", "css", "html/css"],
  linux: ["linux", "unix"],
  bash: ["bash", "shell scripting", "shell"],
  llm: ["llm", "llms", "large language model", "large language models", "gpt", "prompt engineering"],
  git: ["git", "github", "version control"],
  "machine learning": ["machine learning", "ml", "predictive analytics", "predictive modeling", "lstm", "rnn", "knn", "forecasting"],
  "data analysis": ["data analysis", "exploratory data analysis", "eda", "data analytics", "analytics"],
  "data visualization": ["data visualization", "dashboard", "dashboards", "data storytelling"],
  statistics: ["statistics", "statistical", "a/b testing", "ab testing", "hypothesis testing"],
  "product analytics": ["product analytics", "dau", "mau", "retention", "engagement metrics", "conversion"],
  "project management": ["project management", "agile", "scrum", "kanban", "hybrid", "plan-driven"],
  aws: ["aws", "amazon web services", "ec2", "s3", "redshift"],
  gcp: ["gcp", "google cloud", "bigquery", "google colab", "colab"],
  azure: ["azure"],
  snowflake: ["snowflake"],
  spark: ["spark", "pyspark", "hadoop"],
  etl: ["etl", "elt", "data pipeline", "data pipelines", "airflow", "dbt"],
  r: [" r,", " r ", "rstudio", "r language"],
  "communication": ["communication", "stakeholder", "presentation", "presentations"],
};

// Role families: any of the phrases signals membership. Used for role/seniority.
export const ROLE_FAMILIES: Record<string, string[]> = {
  "data analyst": ["data analyst", "data analytics", "analytics analyst", "reporting analyst"],
  "business analyst": ["business analyst", "business systems analyst", "business intelligence analyst", "bi analyst"],
  "product analyst": ["product analyst", "product operations analyst", "product operations", "product ops"],
  "data scientist": ["data scientist", "decision scientist", "applied scientist"],
  "product manager": ["product manager", "associate product manager", "apm", "technical product manager", "product management"],
  "program/project manager": ["program manager", "project manager", "technical program manager", "tpm", "program analyst"],
  "analytics engineer": ["analytics engineer", "data engineer", "analytics engineering"],
  "ai/ml": ["ai analyst", "machine learning", "ml engineer", "ai engineer", "ai product", "ai strategy analyst", "ai operations"],
  "strategy/consulting": ["strategy analyst", "analytics consultant", "data consultant", "technology analyst", "technical analyst"],
};

// Seniority signals that should generally exclude an early-career candidate (§5).
export const SENIOR_TITLE_SIGNALS = [
  "senior", "sr.", "staff", "principal", "lead", "manager", "director",
  "vp", "vice president", "head of", "ii", "iii", "iv", "architect",
];

export const ENTRY_FRIENDLY_SIGNALS = [
  "intern", "internship", "new grad", "new-grad", "newgrad", "early career",
  "early-career", "associate", "rotational", "graduate program", "campus",
  "entry level", "entry-level", "university", "apprentice", "co-op", "coop", "fellow",
];
