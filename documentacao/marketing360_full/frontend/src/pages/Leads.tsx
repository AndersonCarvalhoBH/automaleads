import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Leads(){
  const [leads, setLeads] = useState([]);
  useEffect(()=>{
    axios.get(import.meta.env.VITE_API_URL + '/leads').then(r => {
      setLeads(r.data.data || []);
    }).catch(()=>{});
  },[]);
  return (
    <div>
      <h2>Leads</h2>
      <ul>
        {leads.map((l:any)=> <li key={l.id}>{l.email || l.name}</li>)}
      </ul>
    </div>
  );
}
