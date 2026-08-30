import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff'
  },
  coverPage: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: '100%'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1a1a1a'
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 40
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#2563eb',
    borderBottom: '1pt solid #e5e7eb',
    paddingBottom: 5
  },
  text: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.5,
    marginBottom: 10
  },
  bold: {
    fontWeight: 'bold'
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: 10
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #e5e7eb',
    paddingVertical: 5,
    minHeight: 24,
    alignItems: 'center'
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '2pt solid #9ca3af',
    paddingVertical: 5,
    backgroundColor: '#f3f4f6'
  },
  tableCol: {
    width: '25%',
    paddingHorizontal: 5
  },
  tableCell: {
    fontSize: 9,
    color: '#374151'
  },
  tableCellHeader: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#111827'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1pt solid #e5e7eb',
    paddingTop: 5
  }
});

interface Props {
  caseData: any;
  entities: any[];
  relationships: any[];
  evidence: any[];
}

export default function CaseReportPDF({ caseData, entities, relationships, evidence }: Props) {
  const highRiskEntities = entities.filter(e => e.risk_score > 0.7);
  const locations = entities.filter(e => e.type === 'LOCATION');
  
  return (
    <Document>
      {/* PAGE 1: COVER PAGE */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={{ fontSize: 14, color: '#2563eb', marginBottom: 5, fontWeight: 'bold' }}>NEXUS</Text>
        <Text style={styles.title}>Investigation Intelligence Report</Text>
        <Text style={styles.subtitle}>{caseData?.name || 'Unknown Case'}</Text>
        
        <View style={{ marginTop: 20 }}>
          <Text style={styles.text}><Text style={styles.bold}>Case ID:</Text> {caseData?._id}</Text>
          <Text style={styles.text}><Text style={styles.bold}>Generated Date:</Text> {new Date().toLocaleDateString()}</Text>
          <Text style={styles.text}>
            <Text style={styles.bold}>Classification Level:</Text> {highRiskEntities.length > 3 ? 'CRITICAL / RESTRICTED' : 'CONFIDENTIAL'}
          </Text>
        </View>
      </Page>

      {/* PAGE 2: EXECUTIVE SUMMARY */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <Text style={styles.text}>
          This report provides an AI-synthesized overview of the investigation into {caseData?.name || 'the case'}. 
          It includes network topologies, risk assessments, geographic intelligence, and extracted evidence summaries.
        </Text>
        
        <View style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 15, borderRadius: 5 }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a' }}>{entities.length}</Text>
            <Text style={{ fontSize: 10, color: '#64748b' }}>Total Entities</Text>
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a' }}>{relationships.length}</Text>
            <Text style={{ fontSize: 10, color: '#64748b' }}>Relationships</Text>
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a' }}>{evidence.length}</Text>
            <Text style={{ fontSize: 10, color: '#64748b' }}>Evidence Files</Text>
          </View>
          <View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ef4444' }}>{highRiskEntities.length}</Text>
            <Text style={{ fontSize: 10, color: '#64748b' }}>High Risk Nodes</Text>
          </View>
        </View>
        
        <Text style={styles.sectionTitle}>Key Entities & Risk Assessment</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.tableCol}><Text style={styles.tableCellHeader}>Entity Name</Text></View>
            <View style={styles.tableCol}><Text style={styles.tableCellHeader}>Type</Text></View>
            <View style={styles.tableCol}><Text style={styles.tableCellHeader}>Risk Score</Text></View>
            <View style={styles.tableCol}><Text style={styles.tableCellHeader}>Description</Text></View>
          </View>
          {entities.sort((a,b) => b.risk_score - a.risk_score).slice(0, 15).map((ent, i) => (
            <View style={styles.tableRow} key={i} wrap={false}>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{ent.name}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{ent.type}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{ent.risk_score.toFixed(2)}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>{ent.description?.substring(0, 30) || '-'}</Text></View>
            </View>
          ))}
        </View>
      </Page>

      {/* PAGE 3: NETWORK ANALYSIS & EVIDENCE */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Geographic Intelligence</Text>
        {locations.length === 0 ? (
          <Text style={styles.text}>No significant geographic data found in this case.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>Location</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellHeader}>Risk</Text></View>
              <View style={{...styles.tableCol, width: '50%'}}><Text style={styles.tableCellHeader}>Context</Text></View>
            </View>
            {locations.map((loc, i) => (
              <View style={styles.tableRow} key={i} wrap={false}>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{loc.name}</Text></View>
                <View style={styles.tableCol}><Text style={styles.tableCell}>{loc.risk_score.toFixed(2)}</Text></View>
                <View style={{...styles.tableCol, width: '50%'}}><Text style={styles.tableCell}>{loc.description || 'Monitored location'}</Text></View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Evidence Summary</Text>
        {evidence.length === 0 ? (
          <Text style={styles.text}>No evidence files uploaded for this case.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <View style={{...styles.tableCol, width: '40%'}}><Text style={styles.tableCellHeader}>File Name</Text></View>
              <View style={{...styles.tableCol, width: '20%'}}><Text style={styles.tableCellHeader}>Type</Text></View>
              <View style={{...styles.tableCol, width: '40%'}}><Text style={styles.tableCellHeader}>Summary</Text></View>
            </View>
            {evidence.map((ev, i) => (
              <View style={styles.tableRow} key={i} wrap={false}>
                <View style={{...styles.tableCol, width: '40%'}}><Text style={styles.tableCell}>{ev.filename || ev.title}</Text></View>
                <View style={{...styles.tableCol, width: '20%'}}><Text style={styles.tableCell}>{ev.file_type || ev.type || 'DOCUMENT'}</Text></View>
                <View style={{...styles.tableCol, width: '40%'}}><Text style={styles.tableCell}>{ev.extracted_text?.substring(0, 50) || ev.summary?.substring(0,50) || '-'}</Text></View>
              </View>
            ))}
          </View>
        )}
        
        <View style={styles.footer} fixed>
          <Text>NEXUS Intelligence Platform</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
