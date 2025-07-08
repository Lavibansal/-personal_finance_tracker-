import React from "react";
import { Card, Row } from "antd";
import Button from "../Button"; // Assuming this is a custom Button component
import "./styles.css"; // Assuming you have a CSS file for styling

function Cards({ showExpenseModal, showIncomeModal
  , totalBalance, income, expenses
 }) {
  return (
    <div>
      <Row className="my-row">
        <Card bordered={true} className="my-card">
          <h2>Current Balance</h2>
          <p>₹{typeof totalBalance === 'number' && !isNaN(totalBalance) ? totalBalance : 0}</p>
          <Button text="Reset Balance" blue={true} />
        </Card>

        <Card bordered={true} className="my-card">
          <h2>Total Income</h2>
          <p>₹{typeof income === 'number' && !isNaN(income) ? income : 0}</p>
          <Button text="Add Income" blue={true} onClick={showIncomeModal}/>
        </Card>

        <Card bordered={true} className="my-card">
          <h2>Total Expenses</h2>
          <p>₹{typeof expenses === 'number' && !isNaN(expenses) ? expenses : 0}</p>
          <Button text="Add Expense" blue={true} onClick={showExpenseModal}/>
        </Card>
      </Row>
    </div>
  );
}

export default Cards;
