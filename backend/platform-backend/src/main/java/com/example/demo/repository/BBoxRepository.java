package com.example.demo.repository;

import com.example.demo.model.BBox;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BBoxRepository extends JpaRepository<BBox, Long> {
    List<BBox> findByUserFileId(Long userFileId);
}
