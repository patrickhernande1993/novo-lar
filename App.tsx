import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, CheckCircle2, Circle, Upload, Sparkles, AlertCircle, FileText, Trash2 } from 'lucide-react';
import { Layout } from './components/Layout';
import { Modal } from './components/Modal';
import { Expense, PaymentStatus, ExpenseDraft } from './types';
import { analyzeReceipt } from './services/geminiService';

// Helper to convert file to base64 locally
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = error => reject(error);
  });
};

const STORAGE_KEY = 'apto_expenses_v1';

// Initial dummy data if storage is empty
const INITIAL_EXPENSES: Expense[] = [
  {
    id: '1',
    description: 'Parcela Mensal 09/2025',
    amount: 1250.00,
    dueDate: '2025-09-10',
    status: PaymentStatus.PAID,
    createdAt: Date.now() - 10000000
  },
  {
    id: '2',
    description: 'Manutenção Ar Condicionado',
    amount: 250.00,
    dueDate: '2025-09-15',
    status: PaymentStatus.PENDING,
    createdAt: Date.now()
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('parcelas');
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Form State
  const [draft, setDraft] = useState<ExpenseDraft>({
    description: '',
    amount: 0,
    dueDate: new Date().toISOString().split('T')[0],
    status: PaymentStatus.PENDING,
    receiptBase64: ''
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  // Smart Description: Updates description when Date changes to match "Parcela Mensal MM/AAAA"
  useEffect(() => {
    if (!draft.dueDate) return;
    
    const [year, month] = draft.dueDate.split('-');
    const newDescription = `Parcela Mensal ${month}/${year}`;

    setDraft(prev => {
       // Only update if description is empty or follows the pattern
       if (!prev.description || prev.description.startsWith('Parcela Mensal')) {
           return { ...prev, description: newDescription };
       }
       return prev;
    });
  }, [draft.dueDate]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      const base64 = await fileToBase64(file);
      
      setDraft(prev => ({ ...prev, receiptBase64: base64 }));

      try {
        const analysis = await analyzeReceipt(base64);
        if (analysis) {
            setDraft(prev => ({ ...prev, ...analysis }));
        }
      } catch (err) {
        console.error("Analysis failed", err);
      }
      
    } catch (error) {
      alert("Erro ao anexar arquivo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newExpense: Expense = {
      id: crypto.randomUUID(),
      ...draft,
      createdAt: Date.now()
    };
    setExpenses(prev => [newExpense, ...prev]);
    setIsModalOpen(false);
    
    // Reset draft
    const today = new Date().toISOString().split('T')[0];
    const [year, month] = today.split('-');
    setDraft({
        description: `Parcela Mensal ${month}/${year}`,
        amount: 0,
        dueDate: today,
        status: PaymentStatus.PENDING,
        receiptBase64: ''
    });
  };

  const deleteExpense = (id: string) => {
    if(confirm('Tem certeza que deseja excluir esta parcela?')) {
        setExpenses(prev => prev.filter(e => e.id !== id));
    }
  }

  const toggleStatus = (id: string) => {
      setExpenses(prev => prev.map(e => {
          if (e.id === id) {
              return {
                  ...e,
                  status: e.status === PaymentStatus.PAID ? PaymentStatus.PENDING : PaymentStatus.PAID
              }
          }
          return e;
      }))
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
           <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-sm font-medium text-slate-500">Total Pago (Geral)</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-2">
                    R$ {expenses.filter(e => e.status === PaymentStatus.PAID).reduce((acc, cur) => acc + cur.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <p className="text-sm font-medium text-slate-500">Pendente (Geral)</p>
                  <p className="text-3xl font-bold text-orange-500 mt-2">
                    R$ {expenses.filter(e => e.status === PaymentStatus.PENDING).reduce((acc, cur) => acc + cur.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'parcelas' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Parcelas</h1>
              <p className="text-slate-500 mt-1">Gerenciamento de despesas do apartamento</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Incluir Parcela
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             {/* List Header */}
             <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-4 sm:col-span-4">Descrição</div>
                <div className="col-span-3 sm:col-span-2 text-right sm:text-left">Valor</div>
                <div className="hidden sm:block sm:col-span-3">Vencimento</div>
                <div className="col-span-3 sm:col-span-2 text-center">Status</div>
                <div className="col-span-2 sm:col-span-1 text-right">Ações</div>
             </div>

             {/* List Items */}
             <div className="divide-y divide-slate-100">
               {expenses.length === 0 ? (
                 <div className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                        <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-slate-900 font-medium">Nenhuma parcela registrada</h3>
                    <p className="text-slate-500 text-sm mt-1">Clique em "Incluir Parcela" para começar.</p>
                 </div>
               ) : (
                 expenses.map((expense) => (
                    <div key={expense.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors">
                      <div className="col-span-4 sm:col-span-4">
                        <p className="font-medium text-slate-900 truncate">{expense.description}</p>
                        <p className="text-xs text-slate-500 sm:hidden mt-0.5">{new Date(expense.dueDate).toLocaleDateString('pt-BR')}</p>
                      </div>
                      
                      <div className="col-span-3 sm:col-span-2 text-right sm:text-left font-medium text-slate-700">
                        R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>

                      <div className="hidden sm:block sm:col-span-3 text-sm text-slate-600">
                        <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                            {new Date(expense.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </div>
                      </div>

                      <div className="col-span-3 sm:col-span-2 flex justify-center">
                         <button 
                            onClick={() => toggleStatus(expense.id)}
                            className={`
                                cursor-pointer inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-all hover:shadow-sm
                                ${expense.status === PaymentStatus.PAID 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' 
                                    : 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100'}
                            `}
                         >
                            {expense.status === PaymentStatus.PAID ? 'Pago' : 'Pendente'}
                         </button>
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex justify-end items-center gap-2">
                         {expense.receiptBase64 && (
                            <button 
                                onClick={() => {
                                    const win = window.open();
                                    win?.document.write(`<div style="display:flex;justify-content:center;background:#f1f5f9;height:100vh;align-items:center;"><img src="${expense.receiptBase64}" style="max-width:90%;max-height:90%;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);" /></div>`);
                                }}
                                title="Ver Comprovante"
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                                <FileText className="w-4 h-4" />
                            </button>
                         )}
                         <button 
                            onClick={() => deleteExpense(expense.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                         >
                            <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    </div>
                 ))
               )}
             </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Incluir Parcela"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
           
           {/* Upload Section */}
           <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-indigo-200 border-dashed rounded-lg cursor-pointer hover:bg-indigo-100/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {isAnalyzing ? (
                          <div className="flex items-center text-indigo-600 animate-pulse">
                              <Sparkles className="w-5 h-5 mr-2" />
                              <span className="text-sm font-medium">Anexando...</span>
                          </div>
                      ) : (
                          <>
                            <div className="flex items-center text-indigo-600 mb-1">
                                <Upload className="w-5 h-5 mr-2" />
                                <span className="text-sm font-semibold">Anexar Boleto ou Comprovante</span>
                            </div>
                          </>
                      )}
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                  />
              </label>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data do Boleto</label>
                  <input 
                    type="date"
                    required
                    value={draft.dueDate}
                    onChange={e => setDraft({...draft, dueDate: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
              </div>
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                  <input 
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={draft.amount || ''}
                    onChange={e => setDraft({...draft, amount: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="0,00"
                  />
              </div>
           </div>

           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <input 
                type="text"
                required
                value={draft.description}
                onChange={e => setDraft({...draft, description: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="Parcela Mensal MM/AAAA"
              />
              <p className="text-xs text-slate-400 mt-1">Preenchido automaticamente ao selecionar a data</p>
           </div>

           <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status do Pagamento</label>
              <div className="flex gap-4">
                 <button
                    type="button"
                    onClick={() => setDraft({...draft, status: PaymentStatus.PENDING})}
                    className={`flex-1 flex items-center justify-center px-4 py-3 rounded-xl border transition-all ${
                        draft.status === PaymentStatus.PENDING
                        ? 'bg-amber-50 border-amber-300 text-amber-700 ring-1 ring-amber-300 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                 >
                    <Circle className={`w-4 h-4 mr-2 ${draft.status === PaymentStatus.PENDING ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                    Pendente
                 </button>
                 <button
                    type="button"
                    onClick={() => setDraft({...draft, status: PaymentStatus.PAID})}
                    className={`flex-1 flex items-center justify-center px-4 py-3 rounded-xl border transition-all ${
                        draft.status === PaymentStatus.PAID
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 ring-1 ring-emerald-300 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                 >
                    <CheckCircle2 className={`w-4 h-4 mr-2 ${draft.status === PaymentStatus.PAID ? 'fill-emerald-500 text-emerald-500' : 'text-slate-400'}`} />
                    Pago
                 </button>
              </div>
           </div>

           {draft.receiptBase64 && (
             <div className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                <FileText className="w-5 h-5 text-indigo-500 mr-2" />
                <span className="text-sm text-slate-600 truncate flex-1">Comprovante anexado</span>
                <button 
                    type="button" 
                    onClick={() => setDraft({...draft, receiptBase64: ''})}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                    Remover
                </button>
             </div>
           )}

           <div className="pt-2">
              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-indigo-200 transition-colors focus:ring-4 focus:ring-indigo-100"
              >
                Salvar Parcela
              </button>
           </div>
        </form>
      </Modal>
    </Layout>
  );
}