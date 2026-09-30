# Milestone 23 — Named Crawler Configurations and Run Lineage

A source can now own multiple user-defined crawler configurations.

Each crawler can define:

- name and description;
- enabled/paused state;
- interval;
- keywords;
- subjects;
- locations;
- categories;
- maximum pages;
- maximum requests;
- request delay.

Every acquisition run can reference `crawlerConfigId`, producing the lineage:

`Source → CrawlerConfig → AcquisitionRun → JobListing → Job`

Search-only collectors use the configuration to build their query. Direct collectors apply keyword/subject/location filtering before ingestion.

Failed, challenged, rate-limited, paused and successful crawler states remain visible instead of being removed from history.
