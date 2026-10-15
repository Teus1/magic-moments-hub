export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      attractions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          sort_order: number
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attractions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_runs: {
        Row: {
          attachments_count: number
          error: string | null
          finished_at: string | null
          folder_id: string | null
          folder_url: string | null
          id: string
          requested_by: string | null
          started_at: string
          status: string
          table_counts: Json
          trigger: string
        }
        Insert: {
          attachments_count?: number
          error?: string | null
          finished_at?: string | null
          folder_id?: string | null
          folder_url?: string | null
          id?: string
          requested_by?: string | null
          started_at?: string
          status?: string
          table_counts?: Json
          trigger?: string
        }
        Update: {
          attachments_count?: number
          error?: string | null
          finished_at?: string | null
          folder_id?: string | null
          folder_url?: string | null
          id?: string
          requested_by?: string | null
          started_at?: string
          status?: string
          table_counts?: Json
          trigger?: string
        }
        Relationships: []
      }
      calendar_appointments: {
        Row: {
          created_at: string
          created_by: string | null
          end_at: string
          event_id: string
          id: string
          observations: string
          start_at: string
          title: string
          updated_at: string
          venue: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_at: string
          event_id: string
          id?: string
          observations?: string
          start_at: string
          title: string
          updated_at?: string
          venue?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_at?: string
          event_id?: string
          id?: string
          observations?: string
          start_at?: string
          title?: string
          updated_at?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_appointments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      client_preregistrations: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          event_id: string | null
          expires_at: string
          id: string
          notified_at: string | null
          payload: Json | null
          received_at: string | null
          recipient_name: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          token_hash: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          event_id?: string | null
          expires_at?: string
          id?: string
          notified_at?: string | null
          payload?: Json | null
          received_at?: string | null
          recipient_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          token_hash: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          event_id?: string | null
          expires_at?: string
          id?: string
          notified_at?: string | null
          payload?: Json | null
          received_at?: string | null
          recipient_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_preregistrations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_preregistrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_preregistrations_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_preregistrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_preregistrations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          address_complement: string | null
          address_number: string | null
          birth_date: string | null
          city: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          neighborhood: string | null
          notes: string | null
          phone: string | null
          rg: string | null
          state: string | null
          updated_at: string
          whatsapp: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          rg?: string | null
          state?: string | null
          updated_at?: string
          whatsapp?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          rg?: string | null
          state?: string | null
          updated_at?: string
          whatsapp?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          nickname: string | null
          notes: string | null
          phone: string | null
          pix_key: string | null
          profile_id: string | null
          role_title: string | null
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          nickname?: string | null
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          profile_id?: string | null
          role_title?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          nickname?: string | null
          notes?: string | null
          phone?: string | null
          pix_key?: string | null
          profile_id?: string | null
          role_title?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborators_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attachments: {
        Row: {
          category: Database["public"]["Enums"]["event_attachment_category"]
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          mime_type: string | null
          original_name: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          category: Database["public"]["Enums"]["event_attachment_category"]
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          mime_type?: string | null
          original_name: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          category?: Database["public"]["Enums"]["event_attachment_category"]
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          mime_type?: string | null
          original_name?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attachments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_collaborators: {
        Row: {
          agreed_value: number
          collaborator_id: string
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          notes: string | null
          paid_value: number
          role_title: string | null
          updated_at: string
        }
        Insert: {
          agreed_value?: number
          collaborator_id: string
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          notes?: string | null
          paid_value?: number
          role_title?: string | null
          updated_at?: string
        }
        Update: {
          agreed_value?: number
          collaborator_id?: string
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          paid_value?: number
          role_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_collaborators_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_collaborators_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_collaborators_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_travel_estimates: {
        Row: {
          calculated_at: string
          destination: string
          distance_km: number
          duration_seconds: number
          event_id: string
          manual_toll: number | null
          origin: string
          toll: number | null
        }
        Insert: {
          calculated_at?: string
          destination: string
          distance_km: number
          duration_seconds: number
          event_id: string
          manual_toll?: number | null
          origin: string
          toll?: number | null
        }
        Update: {
          calculated_at?: string
          destination?: string
          distance_km?: number
          duration_seconds?: number
          event_id?: string
          manual_toll?: number | null
          origin?: string
          toll?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_travel_estimates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          attraction_id: string | null
          attraction_start_location: string | null
          balance_value: number | null
          ceremonial_contact: string | null
          ceremonial_name: string | null
          client_id: string
          contact_via_ceremonial: boolean
          contracted_value: number
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          end_time: string | null
          event_date: string
          event_type: string | null
          guest_count: number | null
          has_ceremonial: boolean
          has_guestbook: boolean
          id: string
          instagram_handles: string | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          place_id: string | null
          preregistration_id: string | null
          received_value: number
          referral_other: string | null
          referral_source: string | null
          service_id: string | null
          social_media_consent: boolean | null
          start_time: string | null
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
          venue: string | null
          venue_city: string | null
          venue_state: string | null
        }
        Insert: {
          address?: string | null
          attraction_id?: string | null
          attraction_start_location?: string | null
          balance_value?: number | null
          ceremonial_contact?: string | null
          ceremonial_name?: string | null
          client_id: string
          contact_via_ceremonial?: boolean
          contracted_value?: number
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          event_date: string
          event_type?: string | null
          guest_count?: number | null
          has_ceremonial?: boolean
          has_guestbook?: boolean
          id?: string
          instagram_handles?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          place_id?: string | null
          preregistration_id?: string | null
          received_value?: number
          referral_other?: string | null
          referral_source?: string | null
          service_id?: string | null
          social_media_consent?: boolean | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          venue?: string | null
          venue_city?: string | null
          venue_state?: string | null
        }
        Update: {
          address?: string | null
          attraction_id?: string | null
          attraction_start_location?: string | null
          balance_value?: number | null
          ceremonial_contact?: string | null
          ceremonial_name?: string | null
          client_id?: string
          contact_via_ceremonial?: boolean
          contracted_value?: number
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          event_date?: string
          event_type?: string | null
          guest_count?: number | null
          has_ceremonial?: boolean
          has_guestbook?: boolean
          id?: string
          instagram_handles?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          place_id?: string | null
          preregistration_id?: string | null
          received_value?: number
          referral_other?: string | null
          referral_source?: string | null
          service_id?: string | null
          social_media_consent?: boolean | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
          venue?: string | null
          venue_city?: string | null
          venue_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_attraction_id_fkey"
            columns: ["attraction_id"]
            isOneToOne: false
            referencedRelation: "attractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_preregistration_id_fkey"
            columns: ["preregistration_id"]
            isOneToOne: false
            referencedRelation: "client_preregistrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          id: string
          label: string
          module: string
          sort_order: number
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          label: string
          module: string
          sort_order?: number
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          label?: string
          module?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          last_login_at: string | null
          name: string
          role_id: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          last_login_at?: string | null
          name: string
          role_id?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          last_login_at?: string | null
          name?: string
          role_id?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_field_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          field: string
          id: string
          module: string
          role_id: string
          updated_at: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          field: string
          id?: string
          module: string
          role_id: string
          updated_at?: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          field?: string
          id?: string
          module?: string
          role_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_field_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_groups: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string | null
          event_date: string | null
          id: string
          observations: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          id?: string
          observations?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          event_date?: string | null
          id?: string
          observations?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_groups_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          category: string
          client_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          group_id: string | null
          id: string
          observations: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          category?: string
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          group_id?: string | null
          id?: string
          observations?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          category?: string
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          group_id?: string | null
          id?: string
          observations?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "task_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_settings: {
        Row: {
          base_address: string
          efficiency_km_l: number
          fuel_price: number
          id: boolean
          updated_at: string
        }
        Insert: {
          base_address?: string
          efficiency_km_l?: number
          fuel_price?: number
          id?: boolean
          updated_at?: string
        }
        Update: {
          base_address?: string
          efficiency_km_l?: number
          fuel_price?: number
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_notification_recipients: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notification_recipients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can: { Args: { _action: string; _module: string }; Returns: boolean }
      delete_client_intake_link: { Args: { _id: string }; Returns: undefined }
      has_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      is_active_user: { Args: { _user_id: string }; Returns: boolean }
      is_client_of_my_events: { Args: { _client_id: string }; Returns: boolean }
      is_scheduled_for_event: { Args: { _event_id: string }; Returns: boolean }
      my_collaborator_id: { Args: never; Returns: string }
      review_client_preregistration: {
        Args: { _client_id: string; _fill_missing: boolean; _id: string }
        Returns: string
      }
      submit_client_preregistration: {
        Args: { _hash: string; _payload: Json }
        Returns: string
      }
      task_assignee_options: {
        Args: never
        Returns: {
          active: boolean
          id: string
          name: string
        }[]
      }
      task_client_options: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      touch_last_login: { Args: never; Returns: undefined }
    }
    Enums: {
      event_attachment_category: "receipt" | "document"
      event_status: "planned" | "cancelled"
      payment_method:
        | "pix"
        | "credit"
        | "debit"
        | "cash"
        | "boleto"
        | "transfer"
        | "previous_balance"
      record_status: "active" | "inactive"
      user_status: "active" | "inactive"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      event_attachment_category: ["receipt", "document"],
      event_status: ["planned", "cancelled"],
      payment_method: [
        "pix",
        "credit",
        "debit",
        "cash",
        "boleto",
        "transfer",
        "previous_balance",
      ],
      record_status: ["active", "inactive"],
      user_status: ["active", "inactive"],
    },
  },
} as const
