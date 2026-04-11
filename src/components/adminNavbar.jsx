

const adminNavbar = () => {
  return (
    <div>
        
        <nav>
            <ul>
                <li><a href="/admin/dashboard">Dashboard</a></li>
                <li><a href="/admin/users">Manage Users</a></li>
                <li><a href="/admin/reports">View Reports</a></li>
                <li><a href="/admin/settings">Settings</a></li>
            </ul>
        </nav>
        <hr />
    </div>
  )
}

export default adminNavbar