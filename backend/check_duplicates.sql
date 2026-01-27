-- PostgreSQL 중복 데이터 빠른 확인 스크립트

-- 1. 중복이 있는 파일 확인
SELECT 
    user_file_id,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ' ORDER BY id) as record_ids
FROM title_block_texts
GROUP BY user_file_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 2. 전체 통계
SELECT 
    COUNT(DISTINCT user_file_id) as unique_files,
    COUNT(*) as total_records,
    COUNT(*) - COUNT(DISTINCT user_file_id) as duplicate_records
FROM title_block_texts;

-- 3. 최근 처리된 파일들 (중복 여부 표시)
SELECT 
    t.user_file_id,
    t.id,
    t.project_name,
    t.drawing_name,
    t.processed_at,
    (SELECT COUNT(*) FROM title_block_texts WHERE user_file_id = t.user_file_id) as record_count
FROM title_block_texts t
ORDER BY t.processed_at DESC
LIMIT 20;
