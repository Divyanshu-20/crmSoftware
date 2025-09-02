"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, FileDown, Loader2, X, Edit, Trash2, CreditCard, FileText, Users } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Report, Patient } from "@/components/ReportPdf";
import { ReportDoc, downloadPdf } from "@/components/ReportPdf";
import BillManager from "@/components/BillManager";

type PatientInsert = Omit<Patient, "id" | "created_at">;
type ReportInsert = Omit<Report, "id" | "created_at">;

export default function Home() {
  const [patients, setPatients] = useState<Array<Pick<Patient, "id" | "name" | "age" | "chief_complaint">>>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patientForm, setPatientForm] = useState<PatientInsert>({ name: "", age: 0, contact: "", chief_complaint: "" });
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [reportForm, setReportForm] = useState<ReportInsert>({ patient_id: "", ear: "", nose: "", throat: "", tests: "", diagnosis: "" });
  const [status, setStatus] = useState<string>("");
  const [lastSaved, setLastSaved] = useState<{ patient?: Patient; report?: Report }>({});
  const [query, setQuery] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'reports' | 'bills'>('reports');

  // Prevent background scroll when dialog is open
  useEffect(() => {
    if (openDialog) {
      document.body.classList.add('dialog-open');
    } else {
      document.body.classList.remove('dialog-open');
    }
    
    return () => {
      document.body.classList.remove('dialog-open');
    };
  }, [openDialog]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Load reports when patient is selected
  useEffect(() => {
    const loadReports = async () => {
      if (!selectedPatientId) {
        setReports([]);
        setSelectedReportId("");
        return;
      }
      
      setLoadingReports(true);
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("patient_id", selectedPatientId)
        .order("created_at", { ascending: false });
      
      if (!error && data) {
        setReports(data as Report[]);
        // Auto-select the latest report
        if (data.length > 0) {
          setSelectedReportId(data[0].id);
        }
      }
      setLoadingReports(false);
    };
    
    loadReports();
  }, [selectedPatientId]);

  const filteredPatients = useMemo(() => {
    if (!debouncedQuery) return patients;
    return patients.filter((p) => p.name.toLowerCase().includes(debouncedQuery));
  }, [patients, debouncedQuery]);

  useEffect(() => {
    const load = async () => {
      setLoadingPatients(true);
      const { data, error } = await supabase.from("patients").select("id, name, age, chief_complaint").order("created_at", { ascending: false });
      if (!error && data) setPatients(data as any);
      setLoadingPatients(false);
    };
    load();
  }, []);

  const canSavePatient = useMemo(() => {
    return (
      patientForm.name.trim().length > 0 &&
      patientForm.name.trim().length <= 80 &&
      Number.isInteger(Number(patientForm.age)) &&
      Number(patientForm.age) >= 0 &&
      Number(patientForm.age) <= 120 &&
      patientForm.chief_complaint.trim().length > 0 &&
      patientForm.chief_complaint.trim().length <= 280 &&
      (patientForm.contact || "").length <= 120
    );
  }, [patientForm]);

  const canSaveReport = useMemo(() => {
    return (
      selectedPatientId &&
      reportForm.diagnosis.trim().length > 0 &&
      reportForm.diagnosis.trim().length <= 500
    );
  }, [selectedPatientId, reportForm]);

  const canGeneratePdf = useMemo(() => {
    return selectedPatientId && selectedReportId;
  }, [selectedPatientId, selectedReportId]);

  async function handleAddPatient(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    if (!canSavePatient) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("patients")
      .insert([{ name: patientForm.name.trim(), age: Number(patientForm.age), contact: patientForm.contact || null, chief_complaint: patientForm.chief_complaint.trim() }])
      .select("*")
      .single();
    if (error) {
      setStatus(error.message);
      toast.error("Could not save patient. Try again.");
      setSubmitting(false);
      return;
    }
    const p = data as Patient;
    setPatients((prev) => [{ id: p.id, name: p.name, age: p.age, chief_complaint: p.chief_complaint }, ...prev]);
    setSelectedPatientId(p.id);
    setLastSaved((ls) => ({ ...ls, patient: p }));
    toast.success("Patient saved.");
    setOpenDialog(false);
    setSubmitting(false);
  }

  async function handleUpdatePatient(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPatient || !canSavePatient) return;
    
    setSubmitting(true);
    const { data, error } = await supabase
      .from("patients")
      .update({ 
        name: patientForm.name.trim(), 
        age: Number(patientForm.age), 
        contact: patientForm.contact || null, 
        chief_complaint: patientForm.chief_complaint.trim() 
      })
      .eq("id", editingPatient.id)
      .select("*")
      .single();
    
    if (error) {
      setStatus(error.message);
      toast.error("Could not update patient. Try again.");
      setSubmitting(false);
      return;
    }
    
    const updatedPatient = data as Patient;
    setPatients((prev) => prev.map(p => p.id === updatedPatient.id ? { id: updatedPatient.id, name: updatedPatient.name, age: updatedPatient.age, chief_complaint: updatedPatient.chief_complaint } : p));
    setLastSaved((ls) => ({ ...ls, patient: updatedPatient }));
    toast.success("Patient updated.");
    setEditingPatient(null);
    setSubmitting(false);
  }

  async function handleDeletePatient(patientId: string) {
    if (!confirm("Are you sure you want to delete this patient? This will also delete all their reports.")) return;
    
    const { error } = await supabase
      .from("patients")
      .delete()
      .eq("id", patientId);
    
    if (error) {
      setStatus(error.message);
      toast.error("Could not delete patient. Try again.");
      return;
    }
    
    setPatients((prev) => prev.filter(p => p.id !== patientId));
    if (selectedPatientId === patientId) {
      setSelectedPatientId("");
      setReports([]);
      setSelectedReportId("");
    }
    toast.success("Patient deleted.");
  }

  async function handleAddReport(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    if (!canSaveReport || !selectedPatientId) return;
    const payload = {
      patient_id: selectedPatientId,
      ear: reportForm.ear || null,
      nose: reportForm.nose || null,
      throat: reportForm.throat || null,
      tests: reportForm.tests || null,
      diagnosis: reportForm.diagnosis.trim(),
    };
    const { data, error } = await supabase
      .from("reports")
      .insert([payload])
      .select("*")
      .single();
    if (error) {
      setStatus(error.message);
      toast.error("Could not save report. Try again.");
      return;
    }
    const r = data as Report;
    setLastSaved((ls) => ({ ...ls, report: r }));
    setReports((prev) => [r, ...prev]);
    setSelectedReportId(r.id);
    toast.success("Report saved.");
  }

  async function handleUpdateReport(e: React.FormEvent) {
    e.preventDefault();
    if (!editingReport || !canSaveReport) return;
    
    const payload = {
      ear: reportForm.ear || null,
      nose: reportForm.nose || null,
      throat: reportForm.throat || null,
      tests: reportForm.tests || null,
      diagnosis: reportForm.diagnosis.trim(),
    };
    
    const { data, error } = await supabase
      .from("reports")
      .update(payload)
      .eq("id", editingReport.id)
      .select("*")
      .single();
    
    if (error) {
      setStatus(error.message);
      toast.error("Could not update report. Try again.");
      return;
    }
    
    const updatedReport = data as Report;
    setReports((prev) => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
    setLastSaved((ls) => ({ ...ls, report: updatedReport }));
    toast.success("Report updated.");
    setEditingReport(null);
  }

  async function handleDeleteReport(reportId: string) {
    if (!confirm("Are you sure you want to delete this report?")) return;
    
    const { error } = await supabase
      .from("reports")
      .delete()
      .eq("id", reportId);
    
    if (error) {
      setStatus(error.message);
      toast.error("Could not delete report. Try again.");
      return;
    }
    
    setReports((prev) => prev.filter(r => r.id !== reportId));
    if (selectedReportId === reportId) {
      setSelectedReportId("");
    }
    toast.success("Report deleted.");
  }

  async function handleGeneratePdf() {
    setStatus("");
    try {
      if (!selectedPatientId || !selectedReportId) {
        setStatus("Please select a patient and report.");
        toast.error("Please select a patient and report.");
        return;
      }

      let patient = lastSaved.patient;
      let report = reports.find(r => r.id === selectedReportId);

      if (!patient && selectedPatientId) {
        const { data: p } = await supabase
          .from("patients")
          .select("id, name, age, contact, chief_complaint, created_at")
          .eq("id", selectedPatientId)
          .single();
        patient = p as any;
      }

      if (!report) {
        setStatus("Report not found.");
        toast.error("Report not found.");
        return;
      }

      if (!patient) {
        setStatus("Patient not found.");
        toast.error("Patient not found.");
        return;
      }

      toast.promise(
        downloadPdf(`report-${patient.name}-${report.id}.pdf`, <ReportDoc patient={patient} report={report} />),
        { loading: "Generating PDF...", success: "Report generated successfully!", error: "Could not generate PDF." }
      );
    } catch (err: any) {
      setStatus(err?.message || "Failed to generate PDF");
      toast.error("Could not generate PDF.");
    }
  }

  return (
    <div className="min-h-screen bg-transparent">
      {/* Glass Header */}
      <header className="sticky top-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                ENT Clinic CRM
              </h1>
              <p className="text-gray-400 text-sm">Medical Management System</p>
            </div>
            <div className="flex flex-1 sm:flex-none items-center gap-4">
              <div className="relative flex-1 max-w-md mx-auto sm:mx-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden />
                <input 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)} 
                  placeholder="Search patients…" 
                  className="input-medical w-full text-sm" 
                  style={{ paddingLeft: '56px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px' }}
                />
              </div>
              <button 
                onClick={() => setOpenDialog(true)} 
                className="hidden sm:inline-flex items-center gap-2 btn-primary py-2 px-4 rounded-lg"
              >
                <Plus className="h-4 w-4" aria-hidden /> Add Patient
              </button>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'reports' 
                  ? 'bg-gradient-to-r from-blue-400/20 via-cyan-400/20 to-purple-400/20 text-white border border-blue-400/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="h-4 w-4" />
              Reports
            </button>
            <button
              onClick={() => setActiveTab('bills')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'bills' 
                  ? 'bg-gradient-to-r from-green-400/20 via-cyan-400/20 to-blue-400/20 text-white border border-green-400/30' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Bills & Payments
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {status && <p className="text-red-400 text-sm" role="status">{status}</p>}

      {/* Bills Section */}
      {activeTab === 'bills' && (
        <BillManager 
          patients={patients.map(p => ({
            id: p.id,
            name: p.name,
            age: p.age,
            chief_complaint: p.chief_complaint
          }))}
          selectedPatientId={selectedPatientId}
        />
      )}

      {/* Reports Section */}
      {activeTab === 'reports' && (
        <div className="space-y-6">

      {/* Only show patient list when actively searching */}
      {query && (
        <section className="space-y-4 animate-fade-in-up">
          <div className="card-medical p-6 space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-white">Patients</h2>
              <div className="h-0.5 w-8 bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 rounded-full"></div>
            </div>
            {loadingPatients ? (
              <div className="space-y-3" aria-busy="true">
                <div className="h-16 skeleton rounded-lg" />
                <div className="h-16 skeleton rounded-lg" />
                <div className="h-16 skeleton rounded-lg" />
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-6 text-lg">
                  {query ? "No patients found matching your search." : "No patients yet."}
                </p>
                <button 
                  onClick={() => setOpenDialog(true)} 
                  className="btn-primary px-6 py-3 rounded-lg"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Patient
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPatients.map((p, index) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`patient-card cursor-pointer ${
                      selectedPatientId === p.id ? "selected" : ""
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 via-cyan-400 to-purple-400 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-white text-lg">{p.name}</h3>
                            <p className="text-sm text-gray-400">Age: {p.age} • {p.chief_complaint}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedPatientId === p.id && (
                          <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const fullPatient = patients.find(patient => patient.id === p.id);
                            if (fullPatient) {
                              setEditingPatient(fullPatient as any);
                              setPatientForm({
                                name: fullPatient.name,
                                age: fullPatient.age,
                                contact: "",
                                chief_complaint: fullPatient.chief_complaint
                              });
                              setOpenDialog(true);
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all duration-200"
                          title="Edit patient"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePatient(p.id);
                          }}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-200"
                          title="Delete patient"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Show selected patient info if no search */}
      {selectedPatientId && !query && (
        <section className="space-y-4 animate-fade-in-up">
          <div className="card-medical p-6 space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-white">Selected Patient</h2>
              <div className="h-0.5 w-8 bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 rounded-full"></div>
            </div>
            {(() => {
              const selectedPatient = patients.find(p => p.id === selectedPatientId);
              return selectedPatient ? (
                <div className="p-6 rounded-lg border border-green-400/30 bg-gradient-to-r from-green-400/10 via-cyan-400/10 to-blue-400/10 animate-slide-in-right">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 via-cyan-400 to-blue-400 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {selectedPatient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-xl">{selectedPatient.name}</h3>
                        <p className="text-base text-gray-300">Age: {selectedPatient.age} • {selectedPatient.chief_complaint}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedPatientId("")}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-200"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        </section>
      )}

      <section className="space-y-4 pb-24 animate-fade-in-up">
        <div className="card-medical p-6 space-y-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-white">Add Report</h2>
            <div className="h-0.5 w-8 bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 rounded-full"></div>
          </div>
          
          {/* Report Selection Dropdown */}
          {selectedPatientId && (
            <div className="space-y-3">
              <label htmlFor="reportSelect" className="text-base font-semibold text-white">
                Select Report to Generate PDF
              </label>
              {loadingReports ? (
                <div className="h-12 skeleton rounded-lg" />
              ) : (
                <div className="space-y-3">
                  <select 
                    id="reportSelect"
                    className="input-medical w-full text-sm" 
                    value={selectedReportId} 
                    onChange={(e) => setSelectedReportId(e.target.value)}
                    aria-label="Choose a report"
                  >
                    <option value="">Choose a report</option>
                    {reports.map((report) => (
                      <option key={report.id} value={report.id}>
                        {new Date(report.created_at || Date.now()).toLocaleDateString()} - {report.diagnosis}
                      </option>
                    ))}
                  </select>
                  
                  {selectedReportId && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          const report = reports.find(r => r.id === selectedReportId);
                          if (report) {
                            setEditingReport(report);
                            setReportForm({
                              patient_id: report.patient_id,
                              ear: report.ear || "",
                              nose: report.nose || "",
                              throat: report.throat || "",
                              tests: report.tests || "",
                              diagnosis: report.diagnosis
                            });
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm btn-secondary rounded-lg"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteReport(selectedReportId)}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-red-400/10 hover:bg-red-400/20 text-red-400 rounded-lg transition-all duration-200 border border-red-400/30 hover:border-red-400/50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={editingReport ? handleUpdateReport : handleAddReport}>
            <div className="space-y-2">
              <label htmlFor="ear" className="text-base font-semibold text-white">Ear</label>
              <textarea id="ear" className="input-medical w-full text-sm" placeholder="Ear examination notes..." rows={3} value={reportForm.ear || ""} onChange={(e) => setReportForm({ ...reportForm, ear: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label htmlFor="nose" className="text-base font-semibold text-white">Nose</label>
              <textarea id="nose" className="input-medical w-full text-sm" placeholder="Nose examination notes..." rows={3} value={reportForm.nose || ""} onChange={(e) => setReportForm({ ...reportForm, nose: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label htmlFor="throat" className="text-base font-semibold text-white">Throat</label>
              <textarea id="throat" className="input-medical w-full text-sm" placeholder="Throat examination notes..." rows={3} value={reportForm.throat || ""} onChange={(e) => setReportForm({ ...reportForm, throat: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label htmlFor="tests" className="text-base font-semibold text-white">Tests</label>
              <textarea id="tests" className="input-medical w-full text-sm" placeholder="Recommended tests..." rows={3} value={reportForm.tests || ""} onChange={(e) => setReportForm({ ...reportForm, tests: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="diagnosis" className="text-base font-semibold text-white">Diagnosis <span className="text-red-400">*</span></label>
              <textarea id="diagnosis" className="input-medical w-full text-sm" placeholder="Enter diagnosis (required)..." rows={3} value={reportForm.diagnosis} onChange={(e) => setReportForm({ ...reportForm, diagnosis: e.target.value })} />
            </div>
            <div className="pt-4 flex gap-3 md:col-span-2">
              <button type="submit" disabled={!canSaveReport} className="btn-primary px-6 py-3 text-base disabled:opacity-50">
                {editingReport ? "Update Report" : "Save Report"}
              </button>
              {editingReport && (
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingReport(null);
                    setReportForm({ patient_id: "", ear: "", nose: "", throat: "", tests: "", diagnosis: "" });
                  }}
                  className="btn-secondary px-6 py-3 text-base"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="sticky-footer fixed bottom-0 left-0 right-0">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} 
              className="btn-secondary px-6 py-3 text-base"
            >
              Back to Top
            </button>
            <button 
              onClick={handleGeneratePdf} 
              disabled={!canGeneratePdf}
              className="btn-primary px-6 py-3 text-base disabled:opacity-50"
            >
              <FileDown className="h-4 w-4 mr-2" aria-hidden /> Generate PDF
            </button>
          </div>
        </div>
      </section>

      {/* Mobile FAB */}
      <button onClick={() => setOpenDialog(true)} className="fab sm:hidden fixed bottom-20 right-4 z-40 animate-float">
        <Plus className="h-5 w-5" aria-hidden />
        <span className="sr-only">Add Patient</span>
      </button>

      {/* Premium Glass Dialog */}
      {openDialog && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="dialog-overlay absolute inset-0" onClick={() => {
            setOpenDialog(false);
            setEditingPatient(null);
            setPatientForm({ name: "", age: 0, contact: "", chief_complaint: "" });
          }} />
          <div className="dialog-content relative w-full max-w-md p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">{editingPatient ? "Edit Patient" : "Add Patient"}</h3>
                <p className="text-sm text-gray-400 mt-1">Enter patient information</p>
              </div>
              <button onClick={() => {
                setOpenDialog(false);
                setEditingPatient(null);
                setPatientForm({ name: "", age: 0, contact: "", chief_complaint: "" });
              }} className="p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Close">
                <X className="h-5 w-5 text-gray-400" aria-hidden />
              </button>
            </div>
            <form className="grid grid-cols-1 gap-3" onSubmit={editingPatient ? handleUpdatePatient : handleAddPatient}>
              <div className="space-y-1">
                <label htmlFor="dname" className="text-sm font-semibold text-white">Name <span className="text-red-400">*</span></label>
                <input id="dname" className="input-medical w-full text-sm" placeholder="Enter patient name" value={patientForm.name} onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label htmlFor="dage" className="text-sm font-semibold text-white">Age <span className="text-red-400">*</span></label>
                <input id="dage" className="input-medical w-full text-sm" placeholder="Enter age" type="number" value={patientForm.age} onChange={(e) => setPatientForm({ ...patientForm, age: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <label htmlFor="dcontact" className="text-sm font-semibold text-white">Contact</label>
                <input id="dcontact" className="input-medical w-full text-sm" placeholder="Phone or email (optional)" value={patientForm.contact || ""} onChange={(e) => setPatientForm({ ...patientForm, contact: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label htmlFor="dcc" className="text-sm font-semibold text-white">Chief Complaint <span className="text-red-400">*</span></label>
                <textarea id="dcc" className="input-medical w-full text-sm" placeholder="Primary concern or reason for visit" rows={3} value={patientForm.chief_complaint} onChange={(e) => setPatientForm({ ...patientForm, chief_complaint: e.target.value })} />
              </div>
              <div className="pt-3 flex justify-end gap-3">
                <button type="button" onClick={() => {
                  setOpenDialog(false);
                  setEditingPatient(null);
                  setPatientForm({ name: "", age: 0, contact: "", chief_complaint: "" });
                }} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                <button type="submit" disabled={!canSavePatient || submitting} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden /> : null}
                  {editingPatient ? "Update Patient" : "Save Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      <button onClick={() => setOpenDialog(true)} className="fab sm:hidden fixed bottom-20 right-4 z-40 animate-float">
        <Plus className="h-5 w-5" aria-hidden />
        <span className="sr-only">Add Patient</span>
      </button>

      {/* Premium Glass Dialog */}
      {openDialog && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="dialog-overlay absolute inset-0" onClick={() => {
            setOpenDialog(false);
            setEditingPatient(null);
            setPatientForm({ name: "", age: 0, contact: "", chief_complaint: "" });
          }} />
          <div className="dialog-content relative w-full max-w-md p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">{editingPatient ? "Edit Patient" : "Add Patient"}</h3>
                <p className="text-sm text-gray-400 mt-1">Enter patient information</p>
              </div>
              <button onClick={() => {
                setOpenDialog(false);
                setEditingPatient(null);
                setPatientForm({ name: "", age: 0, contact: "", chief_complaint: "" });
              }} className="p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Close">
                <X className="h-5 w-5 text-gray-400" aria-hidden />
              </button>
            </div>
            <form className="grid grid-cols-1 gap-3" onSubmit={editingPatient ? handleUpdatePatient : handleAddPatient}>
              <div className="space-y-1">
                <label htmlFor="dname" className="text-sm font-semibold text-white">Name <span className="text-red-400">*</span></label>
                <input id="dname" className="input-medical w-full text-sm" placeholder="Enter patient name" value={patientForm.name} onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label htmlFor="dage" className="text-sm font-semibold text-white">Age <span className="text-red-400">*</span></label>
                <input id="dage" className="input-medical w-full text-sm" placeholder="Enter age" type="number" value={patientForm.age} onChange={(e) => setPatientForm({ ...patientForm, age: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <label htmlFor="dcontact" className="text-sm font-semibold text-white">Contact</label>
                <input id="dcontact" className="input-medical w-full text-sm" placeholder="Phone or email (optional)" value={patientForm.contact || ""} onChange={(e) => setPatientForm({ ...patientForm, contact: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label htmlFor="dcc" className="text-sm font-semibold text-white">Chief Complaint <span className="text-red-400">*</span></label>
                <textarea id="dcc" className="input-medical w-full text-sm" placeholder="Primary concern or reason for visit" rows={3} value={patientForm.chief_complaint} onChange={(e) => setPatientForm({ ...patientForm, chief_complaint: e.target.value })} />
              </div>
              <div className="pt-3 flex justify-end gap-3">
                <button type="button" onClick={() => {
                  setOpenDialog(false);
                  setEditingPatient(null);
                  setPatientForm({ name: "", age: 0, contact: "", chief_complaint: "" });
                }} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
                <button type="submit" disabled={!canSavePatient || submitting} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden /> : null}
                  {editingPatient ? "Update Patient" : "Save Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      )}
      </main>
    </div>
  );
}
