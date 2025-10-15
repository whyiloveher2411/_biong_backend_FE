import { CreatePostTypeData } from 'components/pages/PostType/CreateData'
import React, { useState, useEffect } from 'react'
import Typography from 'components/atoms/Typography'
import Card from 'components/atoms/Card'
import Button from 'components/atoms/Button'
import Badge from 'components/atoms/Badge'
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material'
import { 
  People, 
  TrendingUp, 
  AttachMoney, 
  AccessTime, 
  PhoneAndroid, 
  Public, 
  Visibility,
  GetApp,
  Star,
  Speed
} from '@mui/icons-material'

// Mock data cho demo
const mockAnalyticsData = {
  overview: {
    totalUsers: 125430,
    activeUsers: 89420,
    newUsers: 3240,
    sessions: 156780,
    revenue: 45670,
    retention: 78.5
  },
  userMetrics: {
    dailyActiveUsers: [1200, 1350, 1100, 1450, 1600, 1800, 2000],
    weeklyActiveUsers: [8500, 9200, 8800, 9600, 10200, 10800, 11500],
    monthlyActiveUsers: [35000, 38000, 42000, 45000, 48000, 52000, 55000]
  },
  deviceBreakdown: {
    mobile: 68.5,
    desktop: 24.3,
    tablet: 7.2
  },
  topCountries: [
    { name: 'Việt Nam', users: 45670, percentage: 36.4 },
    { name: 'Thái Lan', users: 23450, percentage: 18.7 },
    { name: 'Indonesia', users: 18920, percentage: 15.1 },
    { name: 'Malaysia', users: 15680, percentage: 12.5 },
    { name: 'Philippines', users: 12340, percentage: 9.8 }
  ],
  appMetrics: {
    downloads: 234560,
    installs: 198430,
    uninstalls: 12450,
    crashRate: 2.3,
    avgSessionDuration: 8.5,
    screenViews: 2345670
  }
}

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  color?: string
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, color = "blue" }) => (
  <Card sx={{ p: 3, height: '100%' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280', margin: 0 }}>{title}</p>
        <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '8px 0' }}>{value}</p>
        {change !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
            <Badge 
              color={change >= 0 ? "success" : "error"}
              sx={{ mr: 1 }}
            >
              {change >= 0 ? "+" : ""}{change}%
            </Badge>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>vs tháng trước</span>
          </div>
        )}
      </div>
      <div style={{ 
        padding: '12px', 
        borderRadius: '50%', 
        backgroundColor: color === 'blue' ? '#EFF6FF' : 
                        color === 'green' ? '#F0FDF4' : 
                        color === 'yellow' ? '#FEFCE8' : 
                        color === 'purple' ? '#FAF5FF' : '#F0F9FF'
      }}>
        {icon}
      </div>
    </div>
  </Card>
)

const SimpleChart: React.FC<{ data: number[], title: string, color?: string }> = ({ data, title, color = "blue" }) => {
  const max = Math.max(...data)
  const min = Math.min(...data)
  
  return (
    <Card sx={{ p: 3 }}>
      <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', margin: 0 }}>{title}</h3>
      <div style={{ display: 'flex', alignItems: 'end', gap: '8px', height: '128px' }}>
        {data.map((value, index) => (
          <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div 
              style={{ 
                width: '100%', 
                backgroundColor: color === 'blue' ? '#3B82F6' : color === 'green' ? '#10B981' : '#8B5CF6',
                borderRadius: '4px 4px 0 0',
                height: `${((value - min) / (max - min)) * 100}%`
              }}
            />
            <span style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>{value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Analytics({ data }: { data: CreatePostTypeData }) {
  const [timeRange, setTimeRange] = useState("7d")
  const [activeTab, setActiveTab] = useState("users")
  const [analyticsData, setAnalyticsData] = useState(mockAnalyticsData)

  useEffect(() => {
    // Simulate Firebase data fetching
    setTimeout(() => {
      setAnalyticsData(mockAnalyticsData)
    }, 1000)
  }, [timeRange])

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography variant="h4" style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            Analytics Dashboard
          </Typography>
          <Typography style={{ color: '#6B7280', marginTop: '8px' }}>
            Theo dõi hiệu suất ứng dụng và hành vi người dùng
          </Typography>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Thời gian</InputLabel>
            <Select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              label="Thời gian"
            >
              <MenuItem value="24h">24 giờ qua</MenuItem>
              <MenuItem value="7d">7 ngày qua</MenuItem>
              <MenuItem value="30d">30 ngày qua</MenuItem>
              <MenuItem value="90d">90 ngày qua</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<GetApp />}>
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '24px' 
      }}>
        <MetricCard
          title="Tổng người dùng"
          value={analyticsData.overview.totalUsers.toLocaleString()}
          change={12.5}
          icon={<People sx={{ color: '#3B82F6' }} />}
          color="blue"
        />
        <MetricCard
          title="Người dùng hoạt động"
          value={analyticsData.overview.activeUsers.toLocaleString()}
          change={8.3}
          icon={<Speed sx={{ color: '#10B981' }} />}
          color="green"
        />
        <MetricCard
          title="Doanh thu"
          value={`$${analyticsData.overview.revenue.toLocaleString()}`}
          change={15.2}
          icon={<AttachMoney sx={{ color: '#F59E0B' }} />}
          color="yellow"
        />
        <MetricCard
          title="Tỷ lệ giữ chân"
          value={`${analyticsData.overview.retention}%`}
          change={-2.1}
          icon={<TrendingUp sx={{ color: '#8B5CF6' }} />}
          color="purple"
        />
      </div>

      {/* Charts Section */}
      <div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <Button 
            variant={activeTab === "users" ? "contained" : "outlined"}
            onClick={() => setActiveTab("users")}
          >
            Người dùng
          </Button>
          <Button 
            variant={activeTab === "devices" ? "contained" : "outlined"}
            onClick={() => setActiveTab("devices")}
          >
            Thiết bị
          </Button>
          <Button 
            variant={activeTab === "geography" ? "contained" : "outlined"}
            onClick={() => setActiveTab("geography")}
          >
            Địa lý
          </Button>
          <Button 
            variant={activeTab === "app" ? "contained" : "outlined"}
            onClick={() => setActiveTab("app")}
          >
            Ứng dụng
          </Button>
        </div>

        {activeTab === "users" && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            <SimpleChart 
              data={analyticsData.userMetrics.dailyActiveUsers}
              title="Người dùng hoạt động hàng ngày"
              color="blue"
            />
            <SimpleChart 
              data={analyticsData.userMetrics.weeklyActiveUsers}
              title="Người dùng hoạt động hàng tuần"
              color="green"
            />
          </div>
        )}

        {activeTab === "devices" && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <Card sx={{ p: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <PhoneAndroid sx={{ color: '#3B82F6', fontSize: '32px' }} />
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280', margin: 0 }}>Mobile</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>{analyticsData.deviceBreakdown.mobile}%</p>
                </div>
              </div>
            </Card>
            <Card sx={{ p: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Public sx={{ color: '#10B981', fontSize: '32px' }} />
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280', margin: 0 }}>Desktop</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>{analyticsData.deviceBreakdown.desktop}%</p>
                </div>
              </div>
            </Card>
            <Card sx={{ p: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Visibility sx={{ color: '#8B5CF6', fontSize: '32px' }} />
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280', margin: 0 }}>Tablet</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>{analyticsData.deviceBreakdown.tablet}%</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "geography" && (
          <Card sx={{ p: 3 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', margin: 0 }}>Top quốc gia</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {analyticsData.topCountries.map((country, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{country.name}</span>
                    <Badge color="primary">{country.percentage}%</Badge>
                  </div>
                  <span style={{ fontSize: '14px', color: '#6B7280' }}>{country.users.toLocaleString()} người dùng</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeTab === "app" && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '24px' 
          }}>
            <MetricCard
              title="Tải xuống"
              value={analyticsData.appMetrics.downloads.toLocaleString()}
              change={23.1}
              icon={<GetApp sx={{ color: '#3B82F6' }} />}
              color="blue"
            />
            <MetricCard
              title="Cài đặt"
              value={analyticsData.appMetrics.installs.toLocaleString()}
              change={18.7}
              icon={<PhoneAndroid sx={{ color: '#10B981' }} />}
              color="green"
            />
            <MetricCard
              title="Tỷ lệ crash"
              value={`${analyticsData.appMetrics.crashRate}%`}
              change={-5.2}
              icon={<Speed sx={{ color: '#EF4444' }} />}
              color="red"
            />
            <MetricCard
              title="Thời gian phiên TB"
              value={`${analyticsData.appMetrics.avgSessionDuration} phút`}
              change={12.3}
              icon={<AccessTime sx={{ color: '#8B5CF6' }} />}
              color="purple"
            />
            <MetricCard
              title="Lượt xem màn hình"
              value={analyticsData.appMetrics.screenViews.toLocaleString()}
              change={8.9}
              icon={<Visibility sx={{ color: '#F59E0B' }} />}
              color="yellow"
            />
            <MetricCard
              title="Đánh giá TB"
              value="4.7"
              change={0.2}
              icon={<Star sx={{ color: '#F97316' }} />}
              color="orange"
            />
          </div>
        )}
      </div>

      {/* Real-time Activity */}
      <Card sx={{ p: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Hoạt động thời gian thực</h3>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            backgroundColor: '#F0FDF4', 
            color: '#166534',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: 500
          }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              backgroundColor: '#22C55E', 
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }} />
            Đang hoạt động
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '12px', 
            backgroundColor: '#F9FAFB', 
            borderRadius: '8px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                backgroundColor: '#EFF6FF', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <People sx={{ color: '#3B82F6', fontSize: '16px' }} />
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>Người dùng mới đăng ký</p>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>2 phút trước</p>
              </div>
            </div>
            <Badge color="primary">+1</Badge>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '12px', 
            backgroundColor: '#F9FAFB', 
            borderRadius: '8px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                backgroundColor: '#F0FDF4', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <AttachMoney sx={{ color: '#10B981', fontSize: '16px' }} />
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>Giao dịch mới</p>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>5 phút trước</p>
              </div>
            </div>
            <Badge color="success">$29.99</Badge>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Analytics