import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { opportunitiesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const OpportunityTicket = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [opportunity, setOpportunity] = useState(null);
  const [activities, setActivities] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    value: '',
    pipeline_stage: '',
    closing_probability: 50,
    priority: 'medium',
    next_followup_date: '',
    last_contact_date: '',
    expected_close_date: '',
    notes: ''
  });

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800', icon: '⬇️' },
    { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800', icon: '➡️' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800', icon: '⬆️' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800', icon: '🔥' }
  ];

  const pipelineStages = [
    { key: 'lead', label: 'Lead', color: 'bg-gray-100 text-gray-800' },
    { key: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-800' },
    { key: 'proposal', label: 'Proposal', color: 'bg-yellow-100 text-yellow-800' },
    { key: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-800' },
    { key: 'closed_won', label: 'Closed Won', color: 'bg-green-100 text-green-800' },
    { key: 'closed_lost', label: 'Closed Lost', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    fetchOpportunity();
    fetchActivities();
    fetchComments();
  }, [id]);

  const fetchOpportunity = async () => {
    try {
      const response = await opportunitiesAPI.getById(id);
      setOpportunity(response.data.opportunity);
      setFormData({
        title: response.data.opportunity.title,
        description: response.data.opportunity.description || '',
        value: response.data.opportunity.value,
        pipeline_stage: response.data.opportunity.pipeline_stage,
        closing_probability: response.data.opportunity.closing_probability,
        priority: response.data.opportunity.priority || 'medium',
        next_followup_date: response.data.opportunity.next_followup_date || '',
        last_contact_date: response.data.opportunity.last_contact_date || '',
        expected_close_date: response.data.opportunity.expected_close_date ? 
          new Date(response.data.opportunity.expected_close_date).toISOString().split('T')[0] : '',
        notes: response.data.opportunity.notes || ''
      });
    } catch (error) {
      console.error('Error fetching opportunity:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/opportunity-activities/${id}/activities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivities(response.data.activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/opportunity-activities/${id}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(response.data.comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await opportunitiesAPI.update(id, formData);
      await fetchOpportunity();
      await fetchActivities();
      setIsEditing(false);
      alert('Opportunity updated successfully!');
    } catch (error) {
      console.error('Error updating opportunity:', error);
      alert('Failed to update opportunity');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/opportunity-activities/${id}/comments`,
        { comment: newComment, is_internal: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewComment('');
      await fetchComments();
      await fetchActivities();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    }
  };

  const handleQuickAction = async (action) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      
      let description = '';
      let activityType = '';
      let updateData = { ...formData };

      switch (action) {
        case 'call':
          description = 'Made a phone call';
          activityType = 'call';
          updateData.last_contact_date = new Date().toISOString().split('T')[0];
          break;
        case 'email':
          description = 'Sent an email';
          activityType = 'email';
          updateData.last_contact_date = new Date().toISOString().split('T')[0];
          break;
        case 'meeting':
          description = 'Had a meeting';
          activityType = 'meeting';
          updateData.last_contact_date = new Date().toISOString().split('T')[0];
          break;
        case 'follow_up':
          description = 'Scheduled follow-up';
          activityType = 'follow_up';
          break;
      }

      // Add activity
      await axios.post(
        `${API_URL}/opportunity-activities/${id}/activities`,
        { activity_type: activityType, description },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update last contact date if applicable
      if (updateData.last_contact_date !== formData.last_contact_date) {
        await opportunitiesAPI.update(id, updateData);
        await fetchOpportunity();
      }

      await fetchActivities();
      alert(`${description} logged successfully!`);
    } catch (error) {
      console.error('Error logging activity:', error);
      alert('Failed to log activity');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type) => {
    const icons = {
      created: '➕',
      updated: '✏️',
      stage_change: '🔄',
      priority_change: '🎯',
      probability_change: '📊',
      comment: '💬',
      call: '📞',
      email: '📧',
      meeting: '👥',
      follow_up: '📅'
    };
    return icons[type] || '📌';
  };

  if (loading) {
    return <div className="text-center py-8">Loading opportunity...</div>;
  }

  if (!opportunity) {
    return <div className="text-center py-8">Opportunity not found</div>;
  }

  const priorityConfig = priorities.find(p => p.value === (formData.priority || 'medium'));
  const stageConfig = pipelineStages.find(s => s.key === formData.pipeline_stage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/opportunities')}
            className="text-gray-600 hover:text-gray-800 mt-1"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{opportunity.title}</h1>
            <p className="text-gray-600 mt-1">
              {opportunity.customer_name} • Created {formatDate(opportunity.created_at)}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-secondary"
            >
              ✏️ Edit
            </button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="card bg-gray-50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-sm text-gray-600 block mb-1">Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${stageConfig?.color}`}>
                {stageConfig?.label}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-600 block mb-1">Priority</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityConfig?.color}`}>
                {priorityConfig?.icon} {priorityConfig?.label}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-600 block mb-1">Value</span>
              <span className="text-lg font-bold text-green-600">
                ${parseFloat(opportunity.value).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-600 block mb-1">Probability</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${formData.closing_probability}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{formData.closing_probability}%</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => handleQuickAction('call')}
              className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              title="Log Call"
            >
              📞 Call
            </button>
            <button
              onClick={() => handleQuickAction('email')}
              className="px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
              title="Log Email"
            >
              📧 Email
            </button>
            <button
              onClick={() => handleQuickAction('meeting')}
              className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
              title="Log Meeting"
            >
              👥 Meeting
            </button>
            <button
              onClick={() => handleQuickAction('follow_up')}
              className="px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
              title="Schedule Follow-up"
            >
              📅 Follow-up
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-2 font-medium ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            📋 Overview
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3 px-2 font-medium ${
              activeTab === 'activity'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🕒 Activity ({activities.length})
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`pb-3 px-2 font-medium ${
              activeTab === 'comments'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            💬 Comments ({comments.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="col-span-2 space-y-6">
          {activeTab === 'overview' && (
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Opportunity Details</h2>
              
              {isEditing ? (
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input-field"
                      rows="4"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Deal Value ($) *
                      </label>
                      <input
                        type="number"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        className="input-field"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pipeline Stage *
                      </label>
                      <select
                        value={formData.pipeline_stage}
                        onChange={(e) => setFormData({ ...formData, pipeline_stage: e.target.value })}
                        className="input-field"
                        required
                      >
                        {pipelineStages.map((stage) => (
                          <option key={stage.key} value={stage.key}>{stage.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority *
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="input-field"
                        required
                      >
                        {priorities.map((p) => (
                          <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Closing Probability (%)
                      </label>
                      <input
                        type="range"
                        value={formData.closing_probability}
                        onChange={(e) => setFormData({ ...formData, closing_probability: parseInt(e.target.value) })}
                        className="w-full"
                        min="0"
                        max="100"
                        step="5"
                      />
                      <div className="text-center text-lg font-bold text-gray-700 mt-1">
                        {formData.closing_probability}%
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Next Follow-up Date
                      </label>
                      <input
                        type="date"
                        value={formData.next_followup_date}
                        onChange={(e) => setFormData({ ...formData, next_followup_date: e.target.value })}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expected Close Date
                      </label>
                      <input
                        type="date"
                        value={formData.expected_close_date}
                        onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Internal Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="input-field"
                      rows="3"
                      placeholder="Internal notes (not visible to customer)"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button type="submit" className="btn-primary">
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        fetchOpportunity();
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">Description</h3>
                    <p className="mt-1 text-gray-800">{opportunity.description || 'No description provided'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-600">Next Follow-up</h3>
                      <p className="mt-1 text-gray-800">
                        {opportunity.next_followup_date 
                          ? new Date(opportunity.next_followup_date).toLocaleDateString()
                          : 'Not scheduled'}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-600">Last Contact</h3>
                      <p className="mt-1 text-gray-800">
                        {opportunity.last_contact_date 
                          ? new Date(opportunity.last_contact_date).toLocaleDateString()
                          : 'No contact yet'}
                      </p>
                    </div>
                  </div>

                  {opportunity.notes && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-600">Internal Notes</h3>
                      <p className="mt-1 text-gray-800 bg-yellow-50 p-3 rounded">{opportunity.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Activity Timeline</h2>
              
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No activities yet</p>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3 border-l-2 border-gray-200 pl-4 pb-4">
                      <div className="text-2xl">{getActivityIcon(activity.activity_type)}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-800">{activity.description}</p>
                            <p className="text-sm text-gray-600">
                              by {activity.user_name} • {formatDate(activity.created_at)}
                            </p>
                          </div>
                        </div>
                        {(activity.previous_value || activity.new_value) && (
                          <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
                            {activity.previous_value && (
                              <span className="text-red-600">
                                <del>{activity.previous_value}</del>
                              </span>
                            )}
                            {activity.previous_value && activity.new_value && ' → '}
                            {activity.new_value && (
                              <span className="text-green-600 font-medium">
                                {activity.new_value}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Comments & Discussion</h2>
              
              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="mb-6">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="input-field"
                  rows="3"
                  placeholder="Add a comment..."
                  required
                />
                <button type="submit" className="btn-primary mt-2">
                  💬 Add Comment
                </button>
              </form>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No comments yet</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium text-gray-800">{comment.user_name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details Card */}
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-3">Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600">Customer</span>
                <p className="font-medium text-gray-800">{opportunity.customer_name}</p>
              </div>
              <div>
                <span className="text-gray-600">Assigned To</span>
                <p className="font-medium text-gray-800">{opportunity.assigned_to_name}</p>
              </div>
              <div>
                <span className="text-gray-600">Source</span>
                <p className="font-medium text-gray-800 capitalize">{opportunity.source}</p>
              </div>
              <div>
                <span className="text-gray-600">Created</span>
                <p className="font-medium text-gray-800">
                  {new Date(opportunity.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Last Updated</span>
                <p className="font-medium text-gray-800">
                  {new Date(opportunity.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Card */}
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-3">Progress</h3>
            <div className="space-y-2">
              {pipelineStages.map((stage, index) => {
                const currentStageIndex = pipelineStages.findIndex(s => s.key === formData.pipeline_stage);
                const isPassed = index <= currentStageIndex;
                const isCurrent = stage.key === formData.pipeline_stage;
                
                return (
                  <div key={stage.key} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      isCurrent ? 'bg-blue-500 text-white' :
                      isPassed ? 'bg-green-500 text-white' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {isPassed ? '✓' : index + 1}
                    </div>
                    <span className={`text-sm ${isCurrent ? 'font-bold' : ''}`}>
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpportunityTicket;
