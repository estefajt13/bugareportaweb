package com.bugareporta.microservicio.controller;

import com.bugareporta.microservicio.model.Reporte;
import com.bugareporta.microservicio.model.Funcionario;
import com.bugareporta.microservicio.service.FuncionarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/funcionario")
@CrossOrigin(origins = "*") // Configurar según tu entorno
public class FuncionarioController {

    @Autowired
    private FuncionarioService funcionarioService;

    /**
     * Obtener todos los reportes del área del funcionario
     * GET /api/funcionario/reports
     */
    @GetMapping("/reports")
    public ResponseEntity<List<Reporte>> getReportsByArea(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String fechaDesde,
            @RequestParam(required = false) String fechaHasta,
            @AuthenticationPrincipal Jwt jwt) {
        
        String uid = jwt.getClaim("sub"); // O el claim que uses para el UID
        List<Reporte> reportes = funcionarioService.getReportsByFuncionarioArea(
            uid, estado, fechaDesde, fechaHasta);
        
        return ResponseEntity.ok(reportes);
    }

    /**
     * Obtener detalle de un reporte específico
     * GET /api/funcionario/reports/{id}
     */
    @GetMapping("/reports/{id}")
    public ResponseEntity<Reporte> getReportById(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        
        String uid = jwt.getClaim("sub");
        Reporte reporte = funcionarioService.getReportByIdAndArea(uid, id);
        
        if (reporte != null) {
            return ResponseEntity.ok(reporte);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Asignarse un reporte (cambiar estado a "en_revision")
     * PUT /api/funcionario/reports/{id}/assign
     */
    @PutMapping("/reports/{id}/assign")
    public ResponseEntity<Reporte> assignReport(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        
        String uid = jwt.getClaim("sub");
        Reporte reporte = funcionarioService.assignReport(uid, id);
        
        if (reporte != null) {
            return ResponseEntity.ok(reporte);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Actualizar estado de un reporte
     * PUT /api/funcionario/reports/{id}/status
     */
    @PutMapping("/reports/{id}/status")
    public ResponseEntity<Reporte> updateReportStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal Jwt jwt) {
        
        String uid = jwt.getClaim("sub");
        String nuevoEstado = body.get("estado");
        
        Reporte reporte = funcionarioService.updateReportStatus(uid, id, nuevoEstado);
        
        if (reporte != null) {
            return ResponseEntity.ok(reporte);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Obtener métricas del área del funcionario
     * GET /api/funcionario/dashboard/metrics
     */
    @GetMapping("/dashboard/metrics")
    public ResponseEntity<Map<String, Object>> getDashboardMetrics(
            @AuthenticationPrincipal Jwt jwt) {
        
        String uid = jwt.getClaim("sub");
        Map<String, Object> metrics = funcionarioService.getDashboardMetrics(uid);
        
        return ResponseEntity.ok(metrics);
    }

    /**
     * Obtener áreas disponibles
     * GET /api/funcionario/areas
     */
    @GetMapping("/areas")
    public ResponseEntity<List<Map<String, Object>>> getAreas(
            @AuthenticationPrincipal Jwt jwt) {
        
        List<Map<String, Object>> areas = funcionarioService.getAllAreas();
        return ResponseEntity.ok(areas);
    }
}