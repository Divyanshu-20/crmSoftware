'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

export type Patient = {
  id: string;
  name: string;
  age: number;
  contact: string | null;
  chief_complaint: string;
  occupation?: string;
  address?: string;
  created_at?: string;
};

export type Report = {
  id: string;
  patient_id: string;
  ear: string | null;
  nose: string | null;
  throat: string | null;
  tests: string | null;
  diagnosis: string;
  created_at?: string;
};

export type Hospital = {
  name: string;
  address: string;
  logoUrl?: string;
};

export type Doctor = {
  name: string;
  signatureLine?: string;
};

export type MedicalHistory = {
  date?: string;
  note: string;
};

export type Diagnosis = {
  date?: string;
  detail: string;
};

export type Investigation = {
  name: string;
};

export type Prescription = {
  sn: string;
  formAndDescription: string;
  dosage: string;
};

export type ReportData = {
  hospital: Hospital;
  doctor: Doctor;
  patient: Patient;
  report: Report;
  medicalHistory?: MedicalHistory[];
  diagnosis?: Diagnosis[];
  investigations?: Investigation[];
  prescription?: Prescription[];
  validUntil?: string;
};

const styles = StyleSheet.create({
  // Page setup
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingLeft: 18,
    paddingRight: 18,
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.4,
    color: '#111827',
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.75,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 4,
  },
  hospitalAddress: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 8,
  },
  doctorName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
  },
  patientMRN: {
    fontSize: 10,
    color: '#6B7280',
  },
  
  // Section styles
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  
  // Card styles
  card: {
    backgroundColor: '#F9FAFB',
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 12,
  },
  
  // Patient details
  patientRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  patientLabel: {
    fontSize: 9.5,
    fontWeight: 600,
    color: '#374151',
    width: 80,
  },
  patientValue: {
    fontSize: 11,
    color: '#111827',
    flex: 1,
  },
  
  // Medical history
  historyItem: {
    flexDirection: 'row',
    marginBottom: 4,
    fontSize: 11,
    color: '#111827',
  },
  historyBullet: {
    marginRight: 8,
  },
  historyDate: {
    fontSize: 10,
    color: '#6B7280',
    marginRight: 8,
    minWidth: 60,
  },
  
  // Examinations
  examRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  examLabel: {
    fontSize: 9.5,
    fontWeight: 600,
    color: '#374151',
    width: 60,
  },
  examValue: {
    fontSize: 11,
    color: '#111827',
    flex: 1,
  },
  
  // Diagnosis
  diagnosisItem: {
    flexDirection: 'row',
    marginBottom: 4,
    fontSize: 11,
    color: '#111827',
  },
  diagnosisDate: {
    fontSize: 10,
    color: '#6B7280',
    marginRight: 8,
    minWidth: 60,
  },
  
  // Investigations
  investigationItem: {
    flexDirection: 'row',
    marginBottom: 4,
    fontSize: 11,
    color: '#111827',
  },
  investigationBullet: {
    marginRight: 8,
  },
  
  // Prescription table
  prescriptionTable: {
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  tableRowZebra: {
    backgroundColor: '#F9FAFB',
  },
  tableCellSN: {
    fontSize: 10,
    color: '#111827',
    width: '10%',
  },
  tableCellDesc: {
    fontSize: 10,
    color: '#111827',
    width: '65%',
    paddingRight: 8,
  },
  tableCellDosage: {
    fontSize: 10,
    color: '#111827',
    width: '25%',
  },
  tableHeaderText: {
    fontSize: 9.5,
    fontWeight: 600,
    color: '#374151',
  },
  validUntil: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 8,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  signatureLine: {
    width: 80,
    height: 0.5,
    backgroundColor: '#111827',
    marginBottom: 2,
  },
  signatureText: {
    fontSize: 9,
    color: '#6B7280',
  },
  poweredBy: {
    fontSize: 8,
    color: '#6B7280',
    textAlign: 'right',
  },
  pageNumber: {
    fontSize: 9,
    color: '#6B7280',
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});

export function ReportDoc({ patient, report }: { patient: Patient; report: Report }) {
  // Default hospital and doctor data
  const hospital = {
    name: "CRITICARE HOSPITAL & RESEARCH INSTITUTE",
    address: "123 Medical Center, Healthcare District, City - 123456",
  };
  
  const doctor = {
    name: "Dr. Deepti Jeswani, ENT Surgeon",
  };
  
  // Format date as DD-MM-YYYY
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB');
  };
  
  // Generate MRN
  const mrn = `MRN-${patient.id.slice(-7).toUpperCase()}`;
  
  // Parse diagnosis into array format
  const diagnosis = report.diagnosis ? [{
    detail: report.diagnosis,
    date: formatDate(report.created_at || new Date())
  }] : [];
  
  // Parse investigations from tests field
  const investigations = report.tests ? report.tests.split('\n').filter(t => t.trim()).map(test => ({
    name: test.trim()
  })) : [];
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.hospitalName}>{hospital.name}</Text>
            <Text style={styles.hospitalAddress}>{hospital.address}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.doctorName}>{doctor.name}</Text>
            <Text style={styles.reportDate}>Date: {formatDate(report.created_at || new Date())}</Text>
            <Text style={styles.patientMRN}>{mrn}</Text>
          </View>
        </View>
        
        {/* Patient Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Details</Text>
          <View style={styles.card}>
            <View style={styles.patientRow}>
              <Text style={styles.patientLabel}>Name:</Text>
              <Text style={styles.patientValue}>{patient.name}</Text>
            </View>
            <View style={styles.patientRow}>
              <Text style={styles.patientLabel}>Age:</Text>
              <Text style={styles.patientValue}>{patient.age} years</Text>
            </View>
            {patient.contact && (
              <View style={styles.patientRow}>
                <Text style={styles.patientLabel}>Contact:</Text>
                <Text style={styles.patientValue}>{patient.contact}</Text>
              </View>
            )}
            <View style={styles.patientRow}>
              <Text style={styles.patientLabel}>Reason:</Text>
              <Text style={styles.patientValue}>{patient.chief_complaint}</Text>
            </View>
          </View>
        </View>
        
        {/* Examinations & Vitals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Examinations & Vitals</Text>
          <View style={styles.card}>
            {report.ear && (
              <View style={styles.examRow}>
                <Text style={styles.examLabel}>Ear:</Text>
                <Text style={styles.examValue}>{report.ear}</Text>
              </View>
            )}
            {report.nose && (
              <View style={styles.examRow}>
                <Text style={styles.examLabel}>Nose:</Text>
                <Text style={styles.examValue}>{report.nose}</Text>
              </View>
            )}
            {report.throat && (
              <View style={styles.examRow}>
                <Text style={styles.examLabel}>Throat:</Text>
                <Text style={styles.examValue}>{report.throat}</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Diagnosis */}
        {diagnosis.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diagnosis</Text>
            <View style={styles.card}>
              {diagnosis.map((diag, index) => (
                <View key={index} style={styles.diagnosisItem}>
                  {diag.date && <Text style={styles.diagnosisDate}>{diag.date}</Text>}
                  <Text>{diag.detail}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* Advised Investigations */}
        {investigations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Advised Investigations</Text>
            <View style={styles.card}>
              {investigations.map((investigation, index) => (
                <View key={index} style={styles.investigationItem}>
                  <Text style={styles.investigationBullet}>•</Text>
                  <Text>{investigation.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>Doctor Signature</Text>
          </View>
          <View style={styles.poweredBy}>
            <Text>Powered by MEDNET for {hospital.name}</Text>
            <Text>www.mednetlabs.com</Text>
          </View>
        </View>
        
        <Text style={styles.pageNumber}>Page 1 of 1</Text>
      </Page>
    </Document>
  );
}

export async function downloadPdf(filename: string, jsx: React.ReactElement<any>) {
  const blob = await pdf(jsx).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
