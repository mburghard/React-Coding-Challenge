import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import * as utils from "../utils";

class BalanceOutput extends Component {
  render() {
    if (!this.props.userInput.format) {
      return null;
    }

    return (
      <div className="output">
        <p>
          Total Debit: {this.props.totalDebit} Total Credit:{" "}
          {this.props.totalCredit}
          <br />
          Balance from account {this.props.userInput.startAccount ||
            "*"} to {this.props.userInput.endAccount || "*"} from period{" "}
          {utils.dateToString(this.props.userInput.startPeriod)} to{" "}
          {utils.dateToString(this.props.userInput.endPeriod)}
        </p>
        {this.props.userInput.format === "CSV" ? (
          <pre>{utils.toCSV(this.props.balance)}</pre>
        ) : null}
        {this.props.userInput.format === "HTML" ? (
          <table className="table">
            <thead>
              <tr>
                <th>ACCOUNT</th>
                <th>DESCRIPTION</th>
                <th>DEBIT</th>
                <th>CREDIT</th>
                <th>BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {this.props.balance.map((entry, i) => (
                <tr key={i}>
                  <th scope="row">{entry.ACCOUNT}</th>
                  <td>{entry.DESCRIPTION}</td>
                  <td>{entry.DEBIT}</td>
                  <td>{entry.CREDIT}</td>
                  <td>{entry.BALANCE}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    );
  }
}

BalanceOutput.propTypes = {
  balance: PropTypes.arrayOf(
    PropTypes.shape({
      ACCOUNT: PropTypes.number.isRequired,
      DESCRIPTION: PropTypes.string.isRequired,
      DEBIT: PropTypes.number.isRequired,
      CREDIT: PropTypes.number.isRequired,
      BALANCE: PropTypes.number.isRequired,
    })
  ).isRequired,
  totalCredit: PropTypes.number.isRequired,
  totalDebit: PropTypes.number.isRequired,
  userInput: PropTypes.shape({
    startAccount: PropTypes.number,
    endAccount: PropTypes.number,
    startPeriod: PropTypes.date,
    endPeriod: PropTypes.date,
    format: PropTypes.string,
  }).isRequired,
};

export default connect((state) => {
  let balance = [];
  const journals = state.journalEntries || [];
  const accounts = state.accounts || [];
  const userInput = state.userInput;
  if (!userInput || accounts.length === 0 || journals.length === 0) {
    return { balance, totalCredit: 0, totalDebit: 0, userInput: {} };
  }

  const { startAccount, endAccount, startPeriod, endPeriod } = userInput;

  // Handle wildcards and get period and account data. I would normally modify the util so that only the * wildcard is accepted, but since I'm not sure if I am allowed to modify it, we are simply checking for NaN, which is the output of parseInt or stringToDate for "*".

  const firstAccount = isNaN(startAccount) ? accounts[0].ACCOUNT : startAccount;

  const lastAccount = isNaN(endAccount)
    ? accounts[accounts.length - 1].ACCOUNT
    : endAccount;
  const startDate = isNaN(startPeriod)
    ? new Date(journals[0].PERIOD)
    : new Date(startPeriod);

  const endDate = isNaN(endPeriod)
    ? new Date(journals[journals.length - 1].PERIOD)
    : new Date(endPeriod);
  console.log("endPeriod: ", endDate);

  //Filter entries by account number and period
  const filteredJournals = journals.filter(
    (journal) =>
      journal.ACCOUNT >= firstAccount &&
      journal.ACCOUNT <= lastAccount &&
      new Date(journal.PERIOD) >= startDate &&
      new Date(journal.PERIOD) <= endDate
  );

  accounts.forEach((account) => {
    const accountJournals = filteredJournals.filter(
      (j) => j.ACCOUNT === account.ACCOUNT
    );
    const totalDebit = accountJournals.reduce((acc, j) => acc + j.DEBIT, 0);
    const totalCredit = accountJournals.reduce((acc, j) => acc + j.CREDIT, 0);
    if (totalDebit !== 0 || totalCredit !== 0) {
      balance.push({
        ACCOUNT: account.ACCOUNT,
        DESCRIPTION: account.LABEL,
        DEBIT: totalDebit,
        CREDIT: totalCredit,
        BALANCE: totalDebit - totalCredit,
      });
    }
  });

  const totalCredit = balance.reduce((acc, entry) => acc + entry.CREDIT, 0);
  const totalDebit = balance.reduce((acc, entry) => acc + entry.DEBIT, 0);

  return {
    balance,
    totalCredit,
    totalDebit,
    userInput: state.userInput,
  };
})(BalanceOutput);
