package com.example.demo.repository;

import com.example.demo.model.TitleBlockText;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TitleBlockTextRepository extends JpaRepository<TitleBlockText, Long> {
    List<TitleBlockText> findByUserFileId(Long userFileId);

    Optional<TitleBlockText> findTopByUserFileIdOrderByProcessedAtDesc(Long userFileId);
}
