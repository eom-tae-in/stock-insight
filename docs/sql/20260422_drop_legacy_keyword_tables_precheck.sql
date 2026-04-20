/**
 * 20260422_drop_legacy_keyword_tables.sql 적용 전 확인 SQL
 *
 * 각 테이블의 row_count를 확인하고, 필요한 데이터가 신형 테이블로
 * 이관됐거나 백업됐는지 확인한 뒤 drop migration을 적용한다.
 */

SELECT 'keyword_searches' AS table_name, COUNT(*) AS row_count
FROM keyword_searches;

SELECT 'keyword_chart_timeseries' AS table_name, COUNT(*) AS row_count
FROM keyword_chart_timeseries;

SELECT 'keyword_temporary_overlays' AS table_name, COUNT(*) AS row_count
FROM keyword_temporary_overlays;

SELECT 'keywords' AS table_name, COUNT(*) AS row_count
FROM keywords;

SELECT 'keyword_analysis' AS table_name, COUNT(*) AS row_count
FROM keyword_analysis;

SELECT 'keyword_stock_overlays' AS table_name, COUNT(*) AS row_count
FROM keyword_stock_overlays;

SELECT 'overlay_chart_timeseries' AS table_name, COUNT(*) AS row_count
FROM overlay_chart_timeseries;
