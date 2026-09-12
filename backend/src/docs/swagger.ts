import swaggerJsDoc from 'swagger-jsdoc';

const options: swaggerJsDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SpaceSync REST API',
      version: '1.0.0',
      description: `
**SpaceSync** is a Cloud-Based Shared Resource Booking & Utilization Platform.
Engineered with transaction-safe scheduling, database-level double-booking exclusion constraints (PostgreSQL \`btree_gist\`), and role-based access control (Admin & Member).

### Key Technical Features:
- **Zero-Conflict Guarantee**: Transaction locking with row locks & PostgreSQL range exclusion constraint.
- **Role-Based Access Control**: Strict separation between Member self-service and Admin organization management.
- **Real-Time Availability**: Hourly occupancy timeline per resource.
- **Operational Analytics**: Database-calculated utilization rates, booking volumes, and peak periods.
      `,
      contact: {
        name: 'SpaceSync Engineering',
        email: 'api@spacesync.io',
      },
    },
    servers: (() => {
      const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER_EXTERNAL_URL;
      const productionUrl = process.env.RENDER_EXTERNAL_URL 
        ? `${process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '')}/api`
        : (process.env.BACKEND_URL 
          ? `${process.env.BACKEND_URL.replace(/\/+$/, '')}/api`
          : 'https://spacesync-0uis.onrender.com/api');
      const localUrl = `http://localhost:${process.env.PORT || 5000}/api`;

      if (isProduction) {
        return [
          {
            url: productionUrl,
            description: 'Production Render Deployment',
          },
          {
            url: '/api',
            description: 'Current Origin (Relative /api)',
          },
          {
            url: localUrl,
            description: 'Local Development Server',
          },
        ];
      }

      return [
        {
          url: localUrl,
          description: 'Local Development Server',
        },
        {
          url: productionUrl,
          description: 'Production Render Deployment',
        },
        {
          url: '/api',
          description: 'Current Origin (Relative /api)',
        },
      ];
    })(),
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token obtained from /auth/login or /auth/register',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Alex Johnson' },
            email: { type: 'string', format: 'email', example: 'alex@example.com' },
            role: { type: 'string', enum: ['member', 'admin'], example: 'member' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Resource: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Conference Room Alpha' },
            type: { 
              type: 'string', 
              enum: ['meeting_room', 'conference_room', 'training_room', 'projector', 'workstation', 'lab_equipment', 'study_space'],
              example: 'conference_room' 
            },
            location: { type: 'string', example: 'Building A, Floor 3' },
            capacity: { type: 'integer', example: 20 },
            description: { type: 'string', example: 'Equipped with dual 4K displays and Polycom audio.' },
            status: { type: 'string', enum: ['active', 'maintenance', 'inactive'], example: 'active' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            resource_id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            start_time: { type: 'string', format: 'date-time', example: '2026-09-05T10:00:00.000Z' },
            end_time: { type: 'string', format: 'date-time', example: '2026-09-05T12:00:00.000Z' },
            status: { type: 'string', enum: ['confirmed', 'cancelled'], example: 'confirmed' },
            purpose: { type: 'string', example: 'Sprint Planning and Architecture Review' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Conflict' },
            message: { type: 'string', example: 'This resource is already booked during the selected time.' },
            statusCode: { type: 'integer', example: 409 },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          summary: 'Service & Database Health Check',
          tags: ['Health'],
          responses: {
            200: {
              description: 'Service is healthy and database is connected',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      database: { type: 'string', example: 'connected' },
                      uptime: { type: 'number', example: 124.5 },
                      latency: { type: 'string', example: '4ms' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/auth/register': {
        post: {
          summary: 'Register a new user',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password'],
                  properties: {
                    name: { type: 'string', example: 'Sarah Chen' },
                    email: { type: 'string', example: 'sarah@spacesync.io' },
                    password: { type: 'string', example: 'Member123!' },
                    role: { type: 'string', enum: ['member', 'admin'], default: 'member' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'User created successfully with JWT token' },
            409: { description: 'Email already registered' },
            400: { description: 'Validation failed' },
          },
        },
      },
      '/auth/login': {
        post: {
          summary: 'User Login',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'member1@spacesync.io' },
                    password: { type: 'string', example: 'Member123!' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login successful, returns user and JWT token' },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/auth/me': {
        get: {
          summary: 'Get Current Authenticated User',
          tags: ['Authentication'],
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'User profile returned' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/resources': {
        get: {
          summary: 'List and filter shared resources',
          tags: ['Resources'],
          parameters: [
            { name: 'type', in: 'query', schema: { type: 'string' } },
            { name: 'location', in: 'query', schema: { type: 'string' } },
            { name: 'min_capacity', in: 'query', schema: { type: 'integer' } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          ],
          responses: {
            200: { description: 'List of resources' },
          },
        },
        post: {
          summary: 'Create a new resource (Admin Only)',
          tags: ['Resources'],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'type', 'location', 'capacity'],
                  properties: {
                    name: { type: 'string', example: 'Quiet Study Pod 05' },
                    type: { type: 'string', example: 'study_space' },
                    location: { type: 'string', example: 'Floor 2, Quiet Zone' },
                    capacity: { type: 'integer', example: 2 },
                    description: { type: 'string', example: 'Noise-canceling glass pod' },
                    status: { type: 'string', enum: ['active', 'maintenance', 'inactive'], default: 'active' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Resource created' },
            403: { description: 'Forbidden (Admin role required)' },
          },
        },
      },
      '/resources/{id}': {
        get: {
          summary: 'Get resource details by ID',
          tags: ['Resources'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Resource details' },
            404: { description: 'Resource not found' },
          },
        },
        put: {
          summary: 'Update resource (Admin Only) - Full/Partial Replacement',
          tags: ['Resources'],
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    location: { type: 'string' },
                    capacity: { type: 'integer' },
                    description: { type: 'string' },
                    status: { type: 'string', enum: ['active', 'maintenance', 'inactive'] },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Resource updated successfully' },
            403: { description: 'Admin access required' },
          },
        },
        patch: {
          summary: 'Update resource (Admin Only)',
          tags: ['Resources'],
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    location: { type: 'string' },
                    capacity: { type: 'integer' },
                    description: { type: 'string' },
                    status: { type: 'string', enum: ['active', 'maintenance', 'inactive'] },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Resource updated' },
            403: { description: 'Admin access required' },
          },
        },
        delete: {
          summary: 'Deactivate resource (Admin Only)',
          tags: ['Resources'],
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Resource marked inactive' },
            403: { description: 'Admin access required' },
          },
        },
      },
      '/resources/{id}/availability': {
        get: {
          summary: 'Get hourly availability breakdown for a resource on a specific date',
          tags: ['Availability'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'date', in: 'query', schema: { type: 'string', format: 'date', example: '2026-09-05' } },
          ],
          responses: {
            200: { description: 'Hourly timeline with booked vs available slots' },
          },
        },
      },
      '/bookings': {
        get: {
          summary: 'List bookings (Members view their own, Admins view all with filters)',
          tags: ['Bookings'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'resource_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['confirmed', 'cancelled'] } },
            { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
          ],
          responses: {
            200: { description: 'List of bookings' },
          },
        },
        post: {
          summary: 'Create a new reservation with double-booking collision prevention',
          tags: ['Bookings'],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['resource_id', 'start_time', 'end_time', 'purpose'],
                  properties: {
                    resource_id: { type: 'string', format: 'uuid' },
                    start_time: { type: 'string', format: 'date-time', example: '2026-09-05T10:00:00.000Z' },
                    end_time: { type: 'string', format: 'date-time', example: '2026-09-05T12:00:00.000Z' },
                    purpose: { type: 'string', example: 'Client Demo and Sprint Kickoff' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Booking created successfully' },
            409: { 
              description: 'Conflict! This resource is already booked during the selected time.',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
            },
          },
        },
      },
      '/bookings/my': {
        get: {
          summary: 'List current user active and past bookings',
          tags: ['Bookings'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['confirmed', 'cancelled'] } },
            { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
          ],
          responses: {
            200: { description: 'List of reservations owned by current user' },
          },
        },
      },
      '/bookings/{id}/cancel': {
        patch: {
          summary: 'Cancel a booking and release the time slot',
          tags: ['Bookings'],
          security: [{ BearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Booking cancelled and slot freed' },
            403: { description: 'Forbidden: Cannot cancel another member\'s booking' },
          },
        },
      },
      '/admin/bookings': {
        get: {
          summary: 'Global reservation audit ledger with filtering (Admin Only)',
          tags: ['Admin & Analytics'],
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: 'resource_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'user_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['confirmed', 'cancelled'] } },
            { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          ],
          responses: {
            200: { description: 'Master booking audit list across entire organization' },
            403: { description: 'Admin access required' },
          },
        },
      },
      '/admin/statistics': {
        get: {
          summary: 'Retrieve database-derived KPI statistics (Admin Only)',
          tags: ['Admin & Analytics'],
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Overall platform stats (resources, bookings, cancellation rate, etc.)' },
            403: { description: 'Admin access required' },
          },
        },
      },
      '/admin/utilization': {
        get: {
          summary: 'Retrieve utilization analytics, volume trends, and peak hours (Admin Only)',
          tags: ['Admin & Analytics'],
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'Deep utilization and trend analytics' },
            403: { description: 'Admin access required' },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsDoc(options);
