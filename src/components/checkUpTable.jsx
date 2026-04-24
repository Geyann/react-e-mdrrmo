import React from 'react'

const checkUpTable = () => {
  return (
    <div className="admin-container">
        <table className="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Time Created</th>
                    <th>Patient Name</th>
                    <th>Location / Address</th>
                    <th>Hospital Name</th>
                    <th>Contact Details of Person Reporting</th>
                    <th>Preffered Date</th>
                    <th>Preffered Time</th>
                    <th>Mobility</th>
                    <th>Patient for</th>
                    <th>Escort</th>
                </tr>
            </thead>
        </table>
    </div>
  )
}

export default checkUpTable