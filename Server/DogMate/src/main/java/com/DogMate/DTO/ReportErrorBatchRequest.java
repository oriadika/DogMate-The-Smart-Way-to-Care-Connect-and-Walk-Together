package com.DogMate.DTO;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class ReportErrorBatchRequest {

    private List<ReportErrorRequest> reports = new ArrayList<>();

    public List<ReportErrorRequest> getReports() {
        return reports;
    }

    public void setReports(List<ReportErrorRequest> reports) {
        this.reports = reports != null ? reports : new ArrayList<>();
    }
}
