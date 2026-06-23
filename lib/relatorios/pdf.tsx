import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

export interface PdfDados {
  titulo: string;
  cliente: string | null;
  periodoInicio: string; // "dd/MM"
  periodoFim: string;
  financeiro: {
    investido: string;
    faturamento: string;
    lucro: string;
    roas: string;
    vendas: number;
  };
  trafego: {
    impressoes: string;
    cliques: string;
    ctr: string;
    leads: string;
    cpl: string;
    conversoes: string;
  } | null;
}

const styles = StyleSheet.create({
  page: { backgroundColor: "#0c0d0c", padding: 36, color: "#fff", fontFamily: "Helvetica" },
  header: { borderBottom: "1pt solid #00E19A", paddingBottom: 12, marginBottom: 18 },
  eyebrow: { fontSize: 9, color: "#4DECB3", letterSpacing: 2, marginBottom: 4 },
  titulo: { fontSize: 20, fontWeight: 700 },
  sub: { fontSize: 10, color: "#999", marginTop: 4 },
  secao: { marginBottom: 18 },
  secaoTitulo: { fontSize: 10, fontWeight: 700, color: "#4DECB3", letterSpacing: 1, marginBottom: 10 },
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  kpiCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    border: "0.5pt solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    padding: 12,
  },
  kpiLabel: { fontSize: 8, color: "#888", letterSpacing: 1, marginBottom: 4 },
  kpiValor: { fontSize: 16, fontWeight: 700 },
  kpiSub: { fontSize: 8, color: "#888", marginTop: 3 },
  linha: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottom: "0.5pt solid rgba(255,255,255,0.08)" },
  linhaLabel: { fontSize: 11, color: "#bbb" },
  linhaValor: { fontSize: 11, fontWeight: 700, color: "#fff" },
  footer: { position: "absolute", bottom: 28, left: 36, right: 36, fontSize: 8, color: "#666", textAlign: "center" },
});

function DocumentoRelatorio({ d }: { d: PdfDados }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>SONAR · RELATÓRIO AUTOMÁTICO</Text>
          <Text style={styles.titulo}>{d.titulo}</Text>
          <Text style={styles.sub}>
            Período: {d.periodoInicio} a {d.periodoFim}
            {d.cliente ? ` · ${d.cliente}` : ""}
          </Text>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>FINANCEIRO</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>INVESTIDO</Text>
              <Text style={[styles.kpiValor, { color: "#F0A35E" }]}>{d.financeiro.investido}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>FATURAMENTO</Text>
              <Text style={styles.kpiValor}>{d.financeiro.faturamento}</Text>
              <Text style={styles.kpiSub}>{d.financeiro.vendas} venda(s)</Text>
            </View>
          </View>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>LUCRO BRUTO</Text>
              <Text style={[styles.kpiValor, { color: "#4DECB3" }]}>{d.financeiro.lucro}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>ROAS</Text>
              <Text style={[styles.kpiValor, { color: "#4DECB3" }]}>{d.financeiro.roas}</Text>
            </View>
          </View>
        </View>

        {d.trafego && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>TRÁFEGO</Text>
            <View style={styles.linha}>
              <Text style={styles.linhaLabel}>Impressões</Text>
              <Text style={styles.linhaValor}>{d.trafego.impressoes}</Text>
            </View>
            <View style={styles.linha}>
              <Text style={styles.linhaLabel}>Cliques</Text>
              <Text style={styles.linhaValor}>{d.trafego.cliques} (CTR {d.trafego.ctr})</Text>
            </View>
            <View style={styles.linha}>
              <Text style={styles.linhaLabel}>Leads</Text>
              <Text style={styles.linhaValor}>{d.trafego.leads}</Text>
            </View>
            <View style={styles.linha}>
              <Text style={styles.linhaLabel}>CPL</Text>
              <Text style={styles.linhaValor}>{d.trafego.cpl}</Text>
            </View>
            <View style={styles.linha}>
              <Text style={styles.linhaLabel}>Conversões</Text>
              <Text style={styles.linhaValor}>{d.trafego.conversoes}</Text>
            </View>
          </View>
        )}

        <Text style={styles.footer}>Gerado automaticamente pelo Sonar CRM</Text>
      </Page>
    </Document>
  );
}

/** Gera buffer PDF (chama @react-pdf/renderer). */
export async function gerarBufferPdf(d: PdfDados): Promise<Buffer> {
  return renderToBuffer(<DocumentoRelatorio d={d} />);
}
