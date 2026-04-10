import IncidentReported from '../components/incidentReported'
import BorrowedVehicles from '../components/borrowedVehicles'
import TrackAppointment from '../components/trackAppointment'
import ViewCheckUp from '../components/viewCheckUp'
import React from 'react'

const Admin = () => {

  return (

<div className="admin-container">
  <form>
    <h1>Reported Incidents</h1>
    < IncidentReported />
    <br />
    <h1>Borrowed Vehicles</h1>
    < BorrowedVehicles />
    <br />
    <h1>Appointments</h1>
    < TrackAppointment />
    <h1>Check up table</h1>
    <ViewCheckUp />
    </form>
</div>

  )
}
 export default Admin;