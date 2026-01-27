-- OCR 중복 데이터 정리 스크립트 (PostgreSQL)
-- 파일별로 가장 최근 레코드만 남기고 나머지 삭제

-- Step 1: 현재 중복 상황 확인
SELECT user_file_id, COUNT(*) as count
FROM title_block_texts
GROUP BY user_file_id
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Step 2: 삭제될 레코드 미리보기 (실행 전 확인용)
SELECT t.*
FROM title_block_texts t
WHERE t.id NOT IN (
    SELECT MAX(id)
    FROM title_block_texts
    GROUP BY user_file_id
)
ORDER BY user_file_id, processed_at;

-- Step 3: 중복 레코드 삭제 (파일별 최신 레코드만 유지)
-- 주의: 이 쿼리는 실제로 데이터를 삭제합니다!
-- PostgreSQL에서는 서브쿼리를 직접 사용 가능
DELETE FROM title_block_texts
WHERE id NOT IN (
    SELECT MAX(id)
    FROM title_block_texts
    GROUP BY user_file_id
);

-- Step 4: 정리 후 확인
SELECT user_file_id, COUNT(*) as count
FROM title_block_texts
GROUP BY user_file_id
HAVING COUNT(*) > 1;
-- 결과가 없으면 정리 완료!

-- Step 5: 전체 레코드 수 확인
SELECT COUNT(*) as total_records FROM title_block_texts;

-- Step 6 (선택사항): 테이블 통계 업데이트
ANALYZE title_block_texts;
