# OCR 중복 데이터 정리 가이드

## 현재 상황
데이터베이스에 중복된 OCR 결과가 많이 쌓여있습니다.

## 해결 완료 사항

### 1. Backend 수정 ✅
**파일:** [OcrController.java](file:///d:/AI_Powered_Drawing_Recognition_Platform/backend/platform-backend/src/main/java/com/example/demo/OcrController.java)

**변경 내용:**
- Update-or-Create 패턴 구현
- 기존 OCR 결과가 있으면 업데이트
- 없으면 새로 생성
- 타임스탬프 자동 갱신

**코드 로직:**
```java
// 1. 기존 결과 조회
Optional<TitleBlockText> existingOpt = titleBlockTextRepository
    .findTopByUserFileIdOrderByProcessedAtDesc(fileId);

// 2. 있으면 업데이트, 없으면 생성
if (existingOpt.isPresent()) {
    // 기존 레코드 업데이트
    titleBlockText = existingOpt.get();
    titleBlockText.setExtractedText(extractedText);
    // ... 필드 업데이트
    titleBlockText.setProcessedAt(LocalDateTime.now());
} else {
    // 새 레코드 생성
    titleBlockText = ocrService.parseText(extractedText, userFile);
}
```

---

## 데이터베이스 정리 방법

### 옵션 1: SQL 스크립트 사용 (추천)

**파일:** [cleanup_ocr_duplicates.sql](file:///d:/AI_Powered_Drawing_Recognition_Platform/backend/cleanup_ocr_duplicates.sql)

**실행 방법:**

#### A. pgAdmin 사용 (GUI)

1. **pgAdmin 실행 및 연결**
   - pgAdmin 실행
   - Servers → PostgreSQL → Databases → postgres 연결
   - 비밀번호: `postgres` (application.properties 참고)

2. **Query Tool 열기**
   - `postgres` 데이터베이스 우클릭
   - "Query Tool" 선택

3. **SQL 스크립트 실행**
   - [cleanup_ocr_duplicates.sql](file:///d:/AI_Powered_Drawing_Recognition_Platform/backend/cleanup_ocr_duplicates.sql) 파일 내용 복사
   - Query Tool에 붙여넣기
   - 단계별로 실행 (각 쿼리를 선택하고 F5 또는 실행 버튼)

#### B. psql 명령줄 사용

1. **psql 접속**
   ```bash
   psql -U postgres -d postgres
   # 비밀번호: postgres
   ```

2. **SQL 파일 실행**
   ```bash
   \i d:/AI_Powered_Drawing_Recognition_Platform/backend/cleanup_ocr_duplicates.sql
   ```

   또는 직접 쿼리 실행:
   ```sql
   SELECT user_file_id, COUNT(*) as count
   FROM title_block_texts
   GROUP BY user_file_id
   HAVING COUNT(*) > 1
   ORDER BY count DESC;
   ```

3. **삭제 미리보기 (Step 2)**
   ```sql
   SELECT t.*
   FROM title_block_texts t
   WHERE t.id NOT IN (
       SELECT MAX(id)
       FROM title_block_texts
       GROUP BY user_file_id
   )
   ORDER BY user_file_id, processed_at;
   ```

4. **중복 삭제 실행 (Step 3)**
   ```sql
   DELETE FROM title_block_texts
   WHERE id NOT IN (
       SELECT MAX(id)
       FROM title_block_texts
       GROUP BY user_file_id
   );
   ```

5. **정리 확인 (Step 4)**
   ```sql
   SELECT user_file_id, COUNT(*) as count
   FROM title_block_texts
   GROUP BY user_file_id
   HAVING COUNT(*) > 1;
   ```
   → 결과가 없으면 정리 완료!

---

### 옵션 2: 애플리케이션 재시작 후 자연스럽게 정리

기존 중복 데이터를 그대로 두고, 새로운 OCR 처리부터만 중복 방지할 수도 있습니다.
- 장점: 안전함, 데이터 손실 위험 없음
- 단점: 기존 중복 데이터가 계속 남아있음

---

## 테스트 방법

### 1. Backend 재시작
```bash
# 터미널에서 Ctrl+C로 중지 후
cd backend/platform-backend
mvn spring-boot:run
```

### 2. 중복 방지 테스트
1. AI 인식 페이지에서 파일 선택
2. OCR 처리 실행
3. 같은 파일에 대해 다시 OCR 처리
4. pgAdmin 또는 psql에서 확인:
   ```sql
   SELECT * FROM title_block_texts WHERE user_file_id = {파일ID};
   ```
5. 레코드가 1개만 있고, `processed_at`이 업데이트되었는지 확인

### 3. Frontend 동작 확인
1. 파일 선택 시 기존 결과 자동 표시
2. "다시 인식하기" 버튼 클릭
3. 결과 업데이트 확인
4. 처리 시간이 갱신되었는지 확인

---

## 예상 효과

### Before
```
title_block_texts 테이블:
- 파일 100: 5개 레코드 (중복)
- 파일 101: 3개 레코드 (중복)
- 파일 102: 8개 레코드 (중복)
총 레코드: 많음
```

### After
```
title_block_texts 테이블:
- 파일 100: 1개 레코드 (최신)
- 파일 101: 1개 레코드 (최신)
- 파일 102: 1개 레코드 (최신)
총 레코드: 파일 수와 동일
```

---

## 주의사항

> [!WARNING]
> SQL 삭제 스크립트는 실제로 데이터를 삭제합니다!
> - Step 2로 미리보기 먼저 확인하세요
> - 필요하면 백업을 먼저 하세요

> [!IMPORTANT]
> Backend 재시작 필요
> - 코드 변경사항을 적용하려면 Spring Boot 애플리케이션을 재시작해야 합니다

---

## 다음 단계

1. ✅ Backend 코드 수정 완료
2. ⏳ Backend 재시작
3. ⏳ SQL 스크립트로 기존 중복 정리 (선택사항)
4. ⏳ 테스트 및 검증
