import React, { useState, useEffect } from "react";
import Header from "../components/Header/Header";
import Cards from "../components/cards";
import AddExpenseModal from "../components/Models/addExpense";
import AddIncomeModal from "../components/Models/addIncome";      
import { useAuthState } from "react-firebase-hooks/auth";
import moment from "moment";
import { toast } from "react-toastify";
import { auth, db } from "../Firebase";
import { addDoc, collection, getDocs, query, onSnapshot } from "firebase/firestore";
import TransactionTable from "../components/TransactionTable";
import Charts from "../components/charts";
import LoanTracker from "../components/LoanTracker";
import LoanReminder from "../components/LoanReminder";
import ExpenseTracker from "../components/ExpenseTracker";
import FamilyMembers from "../components/FamilyMembers";
import BillSplitter from "../components/BillSplitter";

function Dashboard (){
//     const transaction=[{
//         type: "Income",
//         date: "2023-10-01",
//         tag: "salary",
//         amount: 1000, 
//         name: "Income - 1" ,  
//     },
//      {type: "Expense",
//         date: "2023-10-01",
//         tag: "Food",
//         amount: 1000, 
//         name: "Expense - 1" , 
//      },
// ];

  const [user, loading] = useAuthState(auth);
  const [isExpenseModalVisible, setIsExpenseModalVisible] = useState(false);
  const [isIncomeModalVisible, setIsIncomeModalVisible] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [expensesList, setExpensesList] = useState([]);


    const showExpenseModal = () => {
        setIsExpenseModalVisible(true);     
    };
    const showIncomeModal = () => {
        setIsIncomeModalVisible(true);
    };      
    const handleExpenseCancel = () => {
        setIsExpenseModalVisible(false);
    };
    const handleIncomeCancel = () => {
        setIsIncomeModalVisible(false);
    };


  const onFinish = (values, type) => {
    // Validation for income
    if (type === 'income') {
      if (!values.amount || isNaN(values.amount) || parseFloat(values.amount) <= 0) {
        toast.error('Please enter a valid positive income amount.');
        return;
      }
      if (!values.name || !values.date || !values.tag) {
        toast.error('Please fill all required fields for income.');
        return;
      }
    }
    const newTransaction = {
      type: type.toLowerCase(),
      date: moment(values.date).format("YYYY-MM-DD"),
      amount: parseFloat(values.amount),
      tag: values.tag,
      name: values.name,
    };
    addTransaction(newTransaction);
  };

   async function addTransaction(transaction) {
    try {
      const docRef = await addDoc(
        collection(db, `users/${user.uid}/transactions`),
        transaction
      );
      console.log("Document written with ID: ", docRef.id);
      toast.success("Transaction added successfully!"); 
    } catch (e) {
      console.error("Error adding document: ", e);
      toast.error("couldn't adding transaction");
    }
  }

  useEffect(() => {
    if (user) {
      // Set up real-time listeners
      const transactionsQuery = query(collection(db, `users/${user.uid}/transactions`));
      const unsubscribeTransactions = onSnapshot(transactionsQuery, (querySnapshot) => {
        let transactionsArray = [];
        querySnapshot.forEach((doc) => {
          transactionsArray.push(doc.data());
        });
        setTransactions(transactionsArray);
      });

      const expensesQuery = query(collection(db, `users/${user.uid}/expenses`));
      const unsubscribeExpenses = onSnapshot(expensesQuery, (querySnapshot) => {
        let expensesArray = [];
        querySnapshot.forEach((doc) => {
          expensesArray.push({ id: doc.id, ...doc.data() });
        });
        setExpensesList(expensesArray);
      });

      fetchLoans();
      fetchFamilyMembers();

      // Cleanup listeners on unmount
      return () => {
        unsubscribeTransactions();
        unsubscribeExpenses();
      };
    }
  }, [user]);

  useEffect(() => {
    calculateBalance();
  }, [transactions, expensesList]);


 const calculateBalance = () => {
    let incomeTotal = 0;
    let expensesTotal = 0;

    transactions.forEach((transaction) => {
      if (transaction.type === "income") {
        incomeTotal += transaction.amount;
      } else if (transaction.type === "expense") {
        expensesTotal += transaction.amount;
      }
    });

    // Only include expenses where userId === user.uid (the user's own share)
    expensesList.forEach((expense) => {
      if (expense.userId === (user && user.uid)) {
        expensesTotal += expense.amount;
      }
    });

    setIncome(incomeTotal);
    setExpenses(expensesTotal);
    setTotalBalance(incomeTotal - expensesTotal);
    setCurrentBalance(incomeTotal - expensesTotal);
  };


async function fetchLoans() {
    if (user) {
      try {
        const q = query(collection(db, `users/${user.uid}/loans`));
        const querySnapshot = await getDocs(q);
        let loansArray = [];
        querySnapshot.forEach((doc) => {
          loansArray.push({ id: doc.id, ...doc.data() });
        });
        setLoans(loansArray);
      } catch (error) {
        console.error('Error fetching loans:', error);
        toast.error('Failed to fetch loans');
      }
    }
  }

  async function fetchFamilyMembers() {
    if (user) {
      try {
        const q = query(collection(db, `users/${user.uid}/family`));
        const querySnapshot = await getDocs(q);
        let membersArray = [];
        querySnapshot.forEach((doc) => {
          membersArray.push({ id: doc.id, ...doc.data() });
        });
        setFamilyMembers(membersArray);
      } catch (error) {
        console.error('Error fetching family members:', error);
        toast.error('Failed to fetch family members');
      }
    }
  }


    return <div className="dashboard-container">
        <Header loans={loans} />
        <div className="dashboard-content">
        <Cards
            totalBalance={totalBalance}
            income={income}
            expenses={expenses}
            showExpenseModal={showExpenseModal}
            showIncomeModal={showIncomeModal}
            // cardStyle={cardStyle}
            // reset={reset}
        />
        <AddExpenseModal
            isExpenseModalVisible={isExpenseModalVisible}
            handleExpenseCancel={handleExpenseCancel}
            onFinish={onFinish}
          />
          <AddIncomeModal
            isIncomeModalVisible={isIncomeModalVisible}
            handleIncomeCancel={handleIncomeCancel}
            onFinish={onFinish}
          /> 
            <Charts transactions={transactions} />
            <ExpenseTracker />
            <FamilyMembers onMemberUpdate={fetchFamilyMembers} />
            <BillSplitter familyMembers={familyMembers} />
            <LoanTracker onLoanUpdate={fetchLoans} />
        <TransactionTable
            transactions={transactions}
            loading={loading}
        />
        </div>
        </div>;
}
export default Dashboard;