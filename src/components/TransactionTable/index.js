import React from "react";
import { Table, Select, Radio } from "antd";
import "./styles.css";  
import { useState } from "react";
import searchimg from "../../assets/searchimg.png";
import { toast } from "react-toastify";
import { parse, unparse } from "papaparse";
import { auth, db } from "../../Firebase";
import { addDoc, collection } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
const { Option } = Select;


function TransactionTable({ transactions, loading, setTransactions }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [sortKey, setSortKey] = useState("");
    const [user] = useAuthState(auth);
    const [isImporting, setIsImporting] = useState(false);


  async function addTransaction(transaction) {
    try {
      const docRef = await addDoc(
        collection(db, `users/${user.uid}/transactions`),
        transaction
      );
      console.log("Document written with ID: ", docRef.id);
      toast.success("Transaction added successfully!"); 
      setTransactions([...transactions, transaction]);
    } catch (e) {
      console.error("Error adding document: ", e);
      toast.error("Couldn't add transaction");
    }
  }

  function importFromCsv(event) {
    event.preventDefault();
    
    if (isImporting) {
      toast.warning("Import already in progress. Please wait...");
      return;
    }
    
    try {
      const file = event.target.files[0];
      if (!file) {
        toast.error("Please select a file");
        return;
      }
      
      setIsImporting(true);
      toast.info("Importing transactions...");
      
      parse(file, {
        header: true,
        complete: async function (results) {
          // Now results.data is an array of objects representing your CSV rows
          console.log("CSV Data:", results.data);
          
          let importedCount = 0;
          let errorCount = 0;
          
          // Process each transaction from CSV
          for (const row of results.data) {
            if (row.name && row.amount && row.type && row.tag && row.date) {
              try {
                const newTransaction = {
                  name: row.name,
                  amount: parseFloat(row.amount),
                  type: row.type.toLowerCase(),
                  tag: row.tag,
                  date: row.date,
                };
                await addTransaction(newTransaction);
                importedCount++;
              } catch (error) {
                errorCount++;
                console.error("Error importing transaction:", row, error);
              }
            } else {
              errorCount++;
              console.warn("Skipping invalid row:", row);
            }
          }
          
          if (importedCount > 0) {
            toast.success(`Successfully imported ${importedCount} transactions!`);
          }
          if (errorCount > 0) {
            toast.warning(`${errorCount} transactions could not be imported.`);
          }
          
          // Reset the file input properly
          event.target.value = "";
          setIsImporting(false);
        },
        error: function (error) {
          toast.error("Error parsing CSV file: " + error.message);
          event.target.value = "";
          setIsImporting(false);
        }
      });
    } catch (e) {
      toast.error("Error reading file: " + e.message);
      event.target.value = "";
      setIsImporting(false);
    }
  }    
  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (text) => (
        <span style={{ fontWeight: 500, color: 'var(--gray-700)' }}>
          {new Date(text).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </span>
      ),
    },
    {
      title: "Description",
      dataIndex: "name",
      key: "description",
      render: (text) => (
        <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
          {text}
        </span>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (text, record) => (
        <span className={record.type === 'income' ? 'amount-positive' : 'amount-negative'}>
          ₹{text.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (text) => (
        <span className={`type-badge ${text}`}>
          {text.charAt(0).toUpperCase() + text.slice(1)}
        </span>
      ),
    },
    {
      title: "Tag",
      dataIndex: "tag",
      key: "tag",
      render: (text) => (
        <span className="tag-badge">
          {text}
        </span>
      ),
    },
  ];


   let filteredTransactions = transactions.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) 
    && (typeFilter ? item.type === typeFilter : true)
  );

let sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortKey === "date") {
      return new Date(a.date) - new Date(b.date);
    } else if (sortKey === "amount") {
      return a.amount - b.amount;
    } else {
      return 0;
    }
  });

  function exportToCsv() {
    var csv = unparse(sortedTransactions, {
        fields: ["date", "name", "amount", "type", "tag"]
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported successfully!");
  }
   return (
    <div
      style={{
        width: "100%",
        padding: "0 var(--space-6)",
        maxWidth: "1400px",
        margin: "0 auto",
        }}
      >
      <div className="table-controls">
        <div className="input-flex">
          <img src={searchimg} width="16" />
          <input
            placeholder="Search by Name"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select
          className="select-input"
          onChange={(value) => setTypeFilter(value)}
          value={typeFilter}
          placeholder="Filter"
          allowClear
        >
          <Option value="">All</Option>
          <Option value="income">Income</Option>
          <Option value="expense">Expense</Option>
        </Select>
      </div>

      {/* <Select
        style={{ width: 200, marginRight: 10 }}
        onChange={(value) => setSelectedTag(value)}
        placeholder="Filter by tag"
        allowClear
      >
        <Option value="food">Food</Option>
        <Option value="education">Education</Option>
        <Option value="office">Office</Option>
      </Select> */}
      <div className="my-table">
        <div className="table-controls">
          <h2>My Transactions</h2>

          <Radio.Group
            className="input-radio"
            onChange={(e) => setSortKey(e.target.value)}
            value={sortKey}
          >
            <Radio.Button value="">No Sort</Radio.Button>
            <Radio.Button value="date">Sort by Date</Radio.Button>
            <Radio.Button value="amount">Sort by Amount</Radio.Button>
          </Radio.Group>
          <div className="action-buttons">
            <button className="btn" 
            onClick={exportToCsv}
             >
              Export to CSV
            </button>
            <label htmlFor="file-csv" className={`btn btn-blue ${isImporting ? 'disabled' : ''}`} style={{ opacity: isImporting ? 0.6 : 1, cursor: isImporting ? 'not-allowed' : 'pointer' }}>
              {isImporting ? 'Importing...' : 'Import from CSV'}
            </label>
            <input
              key={isImporting ? 'importing' : 'ready'}
              onChange={importFromCsv}
              id="file-csv"
              type="file"
              accept=".csv"
              required
              style={{ display: "none" }}
              disabled={isImporting}
            />
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={sortedTransactions}
          loading={loading}
          rowKey={(record, idx) => idx}
          pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'] }}
        />
      </div>
    </div>
  );
};

export default TransactionTable;