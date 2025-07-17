"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Copy } from "lucide-react";

export default function Home() {
  const [termbaseData, setTermbaseData] = useState<string[][]>([]);
  const [updateData, setUpdateData] = useState<string[][]>([]);
  const [termbaseCol, setTermbaseCol] = useState<number>(0);
  const [updateCol, setUpdateCol] = useState<number>(0);
  const [termbaseHasHeader, setTermbaseHasHeader] = useState(true);
  const [updateHasHeader, setUpdateHasHeader] = useState(true);
  const [matches, setMatches] = useState<{ line: string; terms: string[] }[]>([]);
  const [uniqueTerms, setUniqueTerms] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const parseFile = async (file: File): Promise<string[][]> => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    const parseCSV = (raw: string): string[][] => {
      const parsed = Papa.parse<string[]>(raw, { skipEmptyLines: true });
      return parsed.data;
    };

    const parseXLSX = async (file: File): Promise<string[][]> => {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<{ [key: string]: any }>(sheet, { header: 1 });
      return rows as string[][];
    };

    if (ext === "csv" || ext === "txt") {
      const text = await file.text();
      return parseCSV(text);
    } else if (ext === "xlsx") {
      return await parseXLSX(file);
    }
    return [];
  };

  const handleFile = async (file: File, type: "termbase" | "update") => {
    const parsed = await parseFile(file);
    if (type === "termbase") setTermbaseData(parsed);
    else setUpdateData(parsed);
  };

  const findMatches = () => {
    const terms = termbaseData
      .slice(termbaseHasHeader ? 1 : 0)
      .map((row) => row[termbaseCol])
      .filter((term): term is string => typeof term === "string" && term.trim() !== "");

    const lines = updateData.slice(updateHasHeader ? 1 : 0);
    const result: { line: string; terms: string[] }[] = [];

    lines.forEach((row) => {
      const line = row[updateCol];
      if (!line) return;
      const matched = terms.filter((term) => line.includes(term));
      if (matched.length > 0) result.push({ line, terms: matched });
    });

    setMatches(result);
    setUniqueTerms([...new Set(result.flatMap((r) => r.terms))]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderColumnSelector = (
    data: string[][],
    setCol: (val: number) => void,
    hasHeader: boolean,
    setHasHeader: (val: boolean) => void,
    label: string
  ) => {
    if (data.length === 0) return null;
    const sampleRow = data[0];
    return (
      <div className="space-y-2">
        <label className="block font-medium text-gray-700">{label} 열 선택</label>
        <select
          onChange={(e) => setCol(Number(e.target.value))}
          className="w-full bg-white border border-gray-300 text-gray-800 px-3 py-2 rounded shadow"
        >
          {sampleRow.map((val, idx) => (
            <option key={idx} value={idx}>
              {String.fromCharCode(65 + idx)}열: {val}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center mt-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={hasHeader}
            onChange={(e) => setHasHeader(e.target.checked)}
            className="mr-2"
          />
          첫 줄은 헤더 행입니다
        </label>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-white text-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">📄 Term Match Extractor</h1>

        <div className="space-y-4">
          <label className="block text-lg font-semibold">1️⃣ 텀베이스 파일 업로드</label>
          <input
            type="file"
            accept=".csv,.xlsx,.txt"
            id="termbase-upload"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0], "termbase");
            }}
          />
          <label htmlFor="termbase-upload" className="cursor-pointer inline-block bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded shadow">
            📁 텀베이스 파일 선택
          </label>
          {renderColumnSelector(termbaseData, setTermbaseCol, termbaseHasHeader, setTermbaseHasHeader, "텀베이스")}
        </div>

        <div className="space-y-4">
          <label className="block text-lg font-semibold">2️⃣ 업데이트 파일 업로드</label>
          <input
            type="file"
            accept=".csv,.xlsx,.txt"
            id="update-upload"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0], "update");
            }}
          />
          <label htmlFor="update-upload" className="cursor-pointer inline-block bg-green-600 hover:bg-green-500 text-white font-medium px-4 py-2 rounded shadow">
            📁 업데이트 파일 선택
          </label>
          {renderColumnSelector(updateData, setUpdateCol, updateHasHeader, setUpdateHasHeader, "업데이트")}
        </div>

        <button
          onClick={findMatches}
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-2 rounded shadow"
        >
          🔍 용어 추출 실행
        </button>

        {matches.length > 0 && (
          <>
            <div>
              <h2 className="font-semibold text-xl mt-10 mb-2">📌 줄별 용어 매칭 결과</h2>
              <div className="max-h-[400px] overflow-auto border border-gray-300 rounded">
                <table className="w-full table-auto">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 py-1">줄번호</th>
                      <th className="border px-2 py-1">매칭 용어</th>
                      <th className="border px-2 py-1">텍스트</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((m, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="border px-2 py-1 text-center">{i + 1}</td>
                        <td className="border px-2 py-1 text-blue-700 font-medium">{m.terms.join(", ")}</td>
                        <td className="border px-2 py-1 text-sm text-gray-800">{m.line}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="relative">
              <h2 className="font-semibold text-xl mt-10 mb-2">✅ 감지된 용어 (중복 제거)</h2>
              {copied && (
                <div className="absolute top-[-40px] right-0 bg-black text-white text-sm px-3 py-1 rounded shadow transition-opacity duration-300">
                  ✅ 복사 완료!
                </div>
              )}
              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                onClick={() => copyToClipboard(uniqueTerms.join("\n"))}
                title="복사"
              >
                <Copy size={18} />
              </button>
              <textarea
                className="w-full h-32 p-3 bg-gray-100 text-gray-800 border border-gray-300 rounded"
                value={uniqueTerms.join("\n")}
                readOnly
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}