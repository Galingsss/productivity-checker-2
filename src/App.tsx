import { useState, useEffect, useRef } from "react";
import { 
  RefreshCw, 
  ExternalLink,
  AlertCircle,
  Sparkles
} from "lucide-react";

// TS Interfaces matching our spreadsheet columns
interface CheckerRecord {
  name: string;
  so: number;
  sku: number;
  qty: number;
}

interface TableData {
  title: string;
  records: CheckerRecord[];
  grandTotal: CheckerRecord | null;
}

interface DashboardData {
  shift1: TableData;
  shift2: TableData;
  shift3: TableData;
  monthly: TableData;
}

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSWrhWk7XPbOlgcXg8qNdAaH5Rg4pqZEEPuvxWNcVvoLDmYq9znpHv5jg-g_T__YRl-bFaqAZzeDOMT/pub?output=csv";

export default function App() {
  // State variables
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("00.00.00");
  const [countdown, setCountdown] = useState<number>(10);
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);

  // Live Clock State
  const [timeStr, setTimeStr] = useState<string>("00.00.00");
  const [dateStr, setDateStr] = useState<string>("SELASA, 30 JUNI 2026");

  // Interval reference for countdown
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Live clock effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      // Format time as HH.MM.SS
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${hrs}.${mins}.${secs}`);

      // Format date in Indonesian matching the image style
      const daysIndo = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
      const monthsIndo = [
        "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", 
        "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
      ];
      
      const dayName = daysIndo[now.getDay()];
      const dayNum = now.getDate();
      const monthName = monthsIndo[now.getMonth()];
      const year = now.getFullYear();

      setDateStr(`${dayName}, ${dayNum} ${monthName} ${year}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch and Parse CSV Data
  const fetchCSVData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Adding cache-busting timestamp to ensure fresh data from GSheets pub link
      const response = await fetch(`${SHEET_CSV_URL}&t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`Gagal mengambil data: HTTP ${response.status}`);
      }
      const csvText = await response.text();
      
      const parsed = parseGSheetCSV(csvText);
      setData(parsed);
      
      // Set update time
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setLastUpdated(`${h}.${m}.${s}`);
      setCountdown(10); // Reset countdown
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan saat memproses data.");
    } finally {
      setLoading(false);
    }
  };

  // Helper parser for GSheet CSV format
  const parseGSheetCSV = (text: string): DashboardData => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) throw new Error("File CSV kosong");

    const shift1Records: CheckerRecord[] = [];
    const shift2Records: CheckerRecord[] = [];
    const shift3Records: CheckerRecord[] = [];
    const monthlyRecords: CheckerRecord[] = [];

    let shift1Total: CheckerRecord | null = null;
    let shift2Total: CheckerRecord | null = null;
    let shift3Total: CheckerRecord | null = null;
    let monthlyTotal: CheckerRecord | null = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const cells = line.split(',');

      const cleanVal = (val: string) => val ? val.trim() : "";
      const parseNum = (val: string) => {
        if (!val) return 0;
        const clean = cleanVal(val).replace(/[,.]/g, '');
        const num = parseInt(clean, 10);
        return isNaN(num) ? 0 : num;
      };

      // Extract Shift 1
      if (cells.length > 0) {
        const name = cleanVal(cells[0]);
        if (name && name !== "Daily Checker 2 Shift 1" && name !== "Daily Picker Shift 1" && name !== "NAMA") {
          const record: CheckerRecord = {
            name,
            so: parseNum(cells[1]),
            sku: parseNum(cells[2]),
            qty: parseNum(cells[3])
          };
          if (name.toLowerCase() === "grand total") {
            shift1Total = record;
          } else {
            shift1Records.push(record);
          }
        }
      }

      // Extract Shift 2
      if (cells.length > 5) {
        const name = cleanVal(cells[5]);
        if (name && name !== "Daily Checker 2 Shift 2" && name !== "Daily Picker Shift 2" && name !== "NAMA") {
          const record: CheckerRecord = {
            name,
            so: parseNum(cells[6]),
            sku: parseNum(cells[7]),
            qty: parseNum(cells[8])
          };
          if (name.toLowerCase() === "grand total") {
            shift2Total = record;
          } else {
            shift2Records.push(record);
          }
        }
      }

      // Extract Shift 3
      if (cells.length > 10) {
        const name = cleanVal(cells[10]);
        if (name && name !== "Daily Checker 2 Shift 3" && name !== "Daily Picker Shift 3" && name !== "NAMA") {
          const record: CheckerRecord = {
            name,
            so: parseNum(cells[11]),
            sku: parseNum(cells[12]),
            qty: parseNum(cells[13])
          };
          if (name.toLowerCase() === "grand total") {
            shift3Total = record;
          } else {
            shift3Records.push(record);
          }
        }
      }

      // Extract Monthly
      if (cells.length > 15) {
        const name = cleanVal(cells[15]);
        if (name && name !== "Monthly Checker 2" && name !== "Monthly Picker" && name !== "NAMA") {
          const record: CheckerRecord = {
            name,
            so: parseNum(cells[16]),
            sku: parseNum(cells[17]),
            qty: parseNum(cells[18])
          };
          if (name.toLowerCase() === "grand total") {
            monthlyTotal = record;
          } else {
            monthlyRecords.push(record);
          }
        }
      }
    }

    return {
      shift1: {
        title: "DAILY CHECKER 2 SHIFT 1",
        records: shift1Records,
        grandTotal: shift1Total
      },
      shift2: {
        title: "DAILY CHECKER 2 SHIFT 2",
        records: shift2Records,
        grandTotal: shift2Total
      },
      shift3: {
        title: "DAILY CHECKER 2 SHIFT 3",
        records: shift3Records,
        grandTotal: shift3Total
      },
      monthly: {
        title: "MONTHLY CHECKER 2",
        records: monthlyRecords,
        grandTotal: monthlyTotal
      }
    };
  };

  // Initial fetch
  useEffect(() => {
    fetchCSVData();
  }, []);

  // Auto-refresh countdown effect
  useEffect(() => {
    if (!isAutoRefresh || loading) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchCSVData();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAutoRefresh, loading]);

  // Handle manual sync button
  const handleSync = () => {
    fetchCSVData();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans select-none" id="app_root">
      
      {/* High-Contrast Upper Header Bar matching the image exactly */}
      <div className="bg-white px-6 py-2.5 flex flex-col md:flex-row items-center justify-between border-b border-slate-200" id="header_container">
        
        {/* Title Block */}
        <div className="flex flex-col text-center md:text-left" id="title_block">
          <h1 className="font-sans font-black text-2xl md:text-3xl text-[#002d66] tracking-tight leading-none uppercase" id="main_title">
            PRODUCTIVITY CHECKER 2
          </h1>
          <div className="text-blue-600 font-extrabold text-xs mt-1" id="update_info">
            Update: {lastUpdated}
          </div>
        </div>

        {/* Live Clock & Date */}
        <div className="flex flex-col items-center md:items-end text-center md:text-right mt-1.5 md:mt-0" id="clock_block">
          <span className="text-3xl md:text-4xl font-black font-sans text-blue-600 tracking-wide leading-none" id="live_clock">
            {timeStr}
          </span>
          <span className="text-[11px] font-extrabold text-slate-500 tracking-wider uppercase mt-0.5" id="live_date">
            {dateStr}
          </span>
        </div>

      </div>

      {/* Main Content Dashboard Area with Soft Blue-Grey Background */}
      <div className="flex-1 px-5 py-4" id="dashboard_main_content">
        
        {/* Offline / Error Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-800 shadow-sm" id="error_alert">
            <AlertCircle className="w-5 h-5 mt-0.5 text-rose-600 flex-shrink-0" />
            <div className="flex-1" id="error_text">
              <h5 className="font-bold text-sm">Gagal Sinkronisasi Data</h5>
              <p className="text-xs text-rose-600/90 mt-1">{error}</p>
              <button
                id="btn_retry_fetch"
                onClick={handleSync}
                className="mt-3.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold px-3 py-1.5 rounded-lg transition-all shadow-sm shadow-rose-100 flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Coba Lagi Sekarang
              </button>
            </div>
          </div>
        )}

        {/* Loading overlay when initial fetching */}
        {loading && !data && (
          <div className="py-20 flex flex-col items-center justify-center gap-4" id="initial_loader">
            <div className="relative flex items-center justify-center" id="spinner_ring">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
              <Sparkles className="w-4 h-4 text-blue-500 absolute animate-pulse" />
            </div>
            <div className="text-center" id="loader_status">
              <h4 className="font-bold text-slate-800 text-sm">Menghubungkan ke Google Sheets...</h4>
              <p className="text-xs text-slate-400 mt-1">Mengunduh data real-time terbaru.</p>
            </div>
          </div>
        )}

        {/* Cards Grid containing 4 Columns side-by-side matching the image exactly */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start" id="cards_grid">
            
            {/* Table 1: Shift 1 */}
            <DashboardCard 
              id="card_shift1"
              title={data.shift1.title} 
              records={data.shift1.records} 
              isMonthly={false}
            />

            {/* Table 2: Shift 2 */}
            <DashboardCard 
              id="card_shift2"
              title={data.shift2.title} 
              records={data.shift2.records} 
              isMonthly={false}
            />

            {/* Table 3: Shift 3 */}
            <DashboardCard 
              id="card_shift3"
              title={data.shift3.title} 
              records={data.shift3.records} 
              isMonthly={false}
            />

            {/* Table 4: Monthly */}
            <DashboardCard 
              id="card_monthly"
              title={data.monthly.title} 
              records={data.monthly.records} 
              isMonthly={true}
            />

          </div>
        )}

      </div>

      {/* Elegant Light-Themed Bottom Footer Panel matching the image exactly */}
      <div className="bg-[#f8fafc] text-slate-600 px-8 py-3 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 mt-auto" id="footer_panel">
        
        {/* Info Left */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-[12px] font-bold text-slate-500" id="footer_left">
          <span>
            Sistem Monitoring Checker 2 v1.2.0
          </span>
          <a
            id="link_gsheet"
            href={SHEET_CSV_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-blue-600 transition-colors text-blue-500"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Google Sheets Source</span>
          </a>
        </div>

        {/* Sync Controls Right */}
        <div className="flex items-center gap-4 text-[12px] font-bold" id="footer_right">
          <div className="flex items-center gap-1.5 text-slate-500" id="sync_timer_status">
            <span className={`w-2 h-2 rounded-full ${isAutoRefresh ? "bg-emerald-500" : "bg-slate-400"}`} id="timer_dot"></span>
            <span>
              {isAutoRefresh ? `Auto-refresh dalam ${countdown}s` : "Auto-refresh Jeda"}
            </span>
          </div>

          <div className="flex items-center gap-2" id="sync_actions">
            <button
              id="btn_toggle_refresh"
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-600 rounded-lg transition-colors border border-slate-200 text-xs font-bold"
            >
              {isAutoRefresh ? "Jeda" : "Mulai"}
            </button>
            <button
              id="btn_sync_now"
              onClick={handleSync}
              disabled={loading}
              className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${loading ? "animate-spin" : ""}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

// Sub-Component: Individual Dashboard Column Card - Styled exactly as requested in the mockup image
interface DashboardCardProps {
  id: string;
  title: string;
  records: CheckerRecord[];
  isMonthly: boolean;
}

function DashboardCard({
  id,
  title,
  records,
  isMonthly
}: DashboardCardProps) {
  
  // Calculate dynamic monthly target based on active running days in the current month
  // - 1 week = 7 days, each person gets 1 day off (6 working days)
  // - Baseline = 300 SKU per working day
  const getMonthlyTargetSku = () => {
    const now = new Date();
    const currentDay = now.getDate(); // 1 to 31 depending on the day of the month
    const expectedWorkingDays = Math.round(currentDay * 6 / 7);
    const target = Math.max(1, expectedWorkingDays) * 300;
    return { target, currentDay, expectedWorkingDays };
  };

  const monthlyTarget = getMonthlyTargetSku();

  // Custom SKU badge classes:
  // - Daily Shifts: target is 300. Values >= 300 are green, < 300 are red.
  // - Monthly: dynamic target based on current month running days >= target is green, < target is red.
  const getSkuBadgeClass = (value: number) => {
    if (isMonthly) {
      if (value >= monthlyTarget.target) {
        return "bg-[#def7ec] border-[#bfeecf]";
      }
      return "bg-[#fde8e8] border-[#fbd5d5]";
    } else {
      if (value >= 300) {
        return "bg-[#def7ec] border-[#bfeecf]";
      }
      return "bg-[#fde8e8] border-[#fbd5d5]";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm flex flex-col h-[calc(100vh-100px)] min-h-[540px] overflow-hidden" id={id}>
      
      {/* Card Header Panel with Blue centered title and separator line */}
      <div className="pt-2.5 pb-1.5 px-4 flex flex-col items-center text-center" id={`${id}_header`}>
        <h3 className="font-sans font-black text-slate-800 text-sm tracking-wide uppercase" id={`${id}_title`}>
          {title}
        </h3>
        <div className="w-full mt-1.5 h-[3px] bg-[#0a5cff]" id={`${id}_blue_line`}></div>
        <div className="text-[10px] text-slate-400 font-extrabold tracking-wider mt-1" id={`${id}_baseline_info`}>
          {isMonthly ? `TARGET S/D TGL ${monthlyTarget.currentDay}: ≥ ${monthlyTarget.target} SKU` : "TARGET: ≥ 300 SKU"}
        </div>
      </div>

      {/* Table Body - Scrollable Container */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-3" id={`${id}_table_container`}>
        {records.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400" id={`${id}_empty`}>
            <AlertCircle className="w-8 h-8 mb-2 text-slate-300" />
            <p className="text-xs font-bold">Tidak ada data</p>
            <p className="text-[10px] mt-0.5">Data tidak ditemukan.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse table-fixed" id={`${id}_table`}>
            <thead className="bg-white sticky top-0 z-10" id={`${id}_thead`}>
              <tr className="text-[12px] font-black text-[#002d66] tracking-wider uppercase border-t border-b border-slate-200 bg-white" id={`${id}_thead_row`}>
                <th className="py-1.5 px-2 font-black text-left w-[44%]">NAMA</th>
                <th className="py-1.5 px-1 font-black text-center w-[14%]">SO</th>
                <th className="py-1.5 px-1 font-black text-center w-[24%]">SKU</th>
                <th className="py-1.5 pr-4 font-black text-right w-[18%]">QTY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100" id={`${id}_tbody`}>
              {records.map((record, idx) => {
                
                // Shorten very long names to fit columns perfectly as shown in the image
                const displayName = record.name.length > 25 
                  ? record.name.substring(0, 22) + "..." 
                  : record.name;

                return (
                  <tr 
                    key={record.name + "-" + idx}
                    className="hover:bg-slate-50/50 transition-colors"
                    id={`${id}_row_${idx}`}
                  >
                    {/* Name Column - Ultra Bold Upper-Case text with max-width limits */}
                    <td className="py-1.5 px-2 font-sans font-black text-[15px] text-black uppercase" id={`${id}_row_${idx}_name`}>
                      <div className="truncate w-full" title={record.name}>
                        {displayName}
                      </div>
                    </td>

                    {/* SO Column - Plain Bold Text */}
                    <td className="py-1.5 px-1 text-center font-sans font-black text-black text-[15px]" id={`${id}_row_${idx}_so`}>
                      {record.so}
                    </td>

                    {/* SKU Column - Styled as a Colored Pill Badge matching the image */}
                    <td className="py-1 px-1 text-center" id={`${id}_row_${idx}_sku`}>
                      <span className={`inline-block text-center text-[22px] py-0.5 px-3.5 rounded-lg border font-black min-w-[65px] text-black ${getSkuBadgeClass(record.sku)}`}>
                        {record.sku}
                      </span>
                    </td>

                    {/* QTY Column - Plain Bold Text */}
                    <td className="py-1.5 pr-4 text-right font-sans font-black text-black text-[15px]" id={`${id}_row_${idx}_qty`}>
                      {record.qty}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
