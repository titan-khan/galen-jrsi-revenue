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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_recommendations: {
        Row: {
          agent_id: string | null
          created_at: string | null
          description: string | null
          estimated_effort: string | null
          id: string
          potential_impact: string | null
          potential_impact_numeric: number | null
          priority: string | null
          realized_impact: Json | null
          run_id: string | null
          skill_execution_id: string | null
          status: string | null
          title: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_effort?: string | null
          id?: string
          potential_impact?: string | null
          potential_impact_numeric?: number | null
          priority?: string | null
          realized_impact?: Json | null
          run_id?: string | null
          skill_execution_id?: string | null
          status?: string | null
          title: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_effort?: string | null
          id?: string
          potential_impact?: string | null
          potential_impact_numeric?: number | null
          priority?: string | null
          realized_impact?: Json | null
          run_id?: string | null
          skill_execution_id?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_recommendations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_recommendations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_recommendations_skill_execution_id_fkey"
            columns: ["skill_execution_id"]
            isOneToOne: false
            referencedRelation: "skill_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_id: string | null
          completed_at: string | null
          error_message: string | null
          findings: Json | null
          id: string
          plan: Json | null
          recommendations: Json | null
          skill_outputs: Json | null
          started_at: string | null
          status: string
          trigger: string | null
        }
        Insert: {
          agent_id?: string | null
          completed_at?: string | null
          error_message?: string | null
          findings?: Json | null
          id?: string
          plan?: Json | null
          recommendations?: Json | null
          skill_outputs?: Json | null
          started_at?: string | null
          status?: string
          trigger?: string | null
        }
        Update: {
          agent_id?: string | null
          completed_at?: string | null
          error_message?: string | null
          findings?: Json | null
          id?: string
          plan?: Json | null
          recommendations?: Json | null
          skill_outputs?: Json | null
          started_at?: string | null
          status?: string
          trigger?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_skills: {
        Row: {
          category: string
          confidence_scoring: Json | null
          created_at: string | null
          description: string
          display_name: string
          hard_rules: Json
          icon: string | null
          id: string
          input_requirements: Json
          is_active: boolean | null
          name: string
          output_template: string
          purpose: string
          section_logic: Json
          updated_at: string | null
          version: number | null
        }
        Insert: {
          category?: string
          confidence_scoring?: Json | null
          created_at?: string | null
          description: string
          display_name: string
          hard_rules?: Json
          icon?: string | null
          id?: string
          input_requirements?: Json
          is_active?: boolean | null
          name: string
          output_template: string
          purpose: string
          section_logic?: Json
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          category?: string
          confidence_scoring?: Json | null
          created_at?: string | null
          description?: string
          display_name?: string
          hard_rules?: Json
          icon?: string | null
          id?: string
          input_requirements?: Json
          is_active?: boolean | null
          name?: string
          output_template?: string
          purpose?: string
          section_logic?: Json
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      agents: {
        Row: {
          anomaly_threshold: number | null
          category: string
          created_at: string | null
          created_by: string | null
          current_phase: string | null
          current_plan: Json | null
          description: string | null
          goal: string | null
          id: string
          last_run_at: string | null
          monitored_metric_ids: string[] | null
          name: string
          schedule: Json | null
          skill_chain: Json | null
          skill_ids: string[] | null
          status: string
          template_id: string | null
          time_range: string | null
          total_runs: number | null
          trust_score: number | null
          updated_at: string | null
        }
        Insert: {
          anomaly_threshold?: number | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          current_phase?: string | null
          current_plan?: Json | null
          description?: string | null
          goal?: string | null
          id?: string
          last_run_at?: string | null
          monitored_metric_ids?: string[] | null
          name: string
          schedule?: Json | null
          skill_chain?: Json | null
          skill_ids?: string[] | null
          status?: string
          template_id?: string | null
          time_range?: string | null
          total_runs?: number | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Update: {
          anomaly_threshold?: number | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          current_phase?: string | null
          current_plan?: Json | null
          description?: string | null
          goal?: string | null
          id?: string
          last_run_at?: string | null
          monitored_metric_ids?: string[] | null
          name?: string
          schedule?: Json | null
          skill_chain?: Json | null
          skill_ids?: string[] | null
          status?: string
          template_id?: string | null
          time_range?: string | null
          total_runs?: number | null
          trust_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      assistant_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      dim_customer: {
        Row: {
          active_flag: boolean | null
          age_group: string | null
          created_at: string | null
          customer_id: string
          customer_type: string
          first_trip_date: string | null
          gender: string | null
          home_city: string | null
          loyalty_tier: string | null
        }
        Insert: {
          active_flag?: boolean | null
          age_group?: string | null
          created_at?: string | null
          customer_id: string
          customer_type: string
          first_trip_date?: string | null
          gender?: string | null
          home_city?: string | null
          loyalty_tier?: string | null
        }
        Update: {
          active_flag?: boolean | null
          age_group?: string | null
          created_at?: string | null
          customer_id?: string
          customer_type?: string
          first_trip_date?: string | null
          gender?: string | null
          home_city?: string | null
          loyalty_tier?: string | null
        }
        Relationships: []
      }
      dim_driver: {
        Row: {
          active_flag: boolean | null
          base_station_id: string | null
          created_at: string | null
          driver_id: string
          driver_name: string
          employment_type: string
          experience_years: number | null
          hire_date: string | null
          license_level: string | null
        }
        Insert: {
          active_flag?: boolean | null
          base_station_id?: string | null
          created_at?: string | null
          driver_id: string
          driver_name: string
          employment_type: string
          experience_years?: number | null
          hire_date?: string | null
          license_level?: string | null
        }
        Update: {
          active_flag?: boolean | null
          base_station_id?: string | null
          created_at?: string | null
          driver_id?: string
          driver_name?: string
          employment_type?: string
          experience_years?: number | null
          hire_date?: string | null
          license_level?: string | null
        }
        Relationships: []
      }
      dim_fleet: {
        Row: {
          active_flag: boolean | null
          capex_cost: number | null
          created_at: string | null
          fleet_category: string
          fleet_id: string
          fleet_name: string
          operator: string | null
          opex_cost_per_month: number | null
          service_level: string | null
          vehicle_type: string | null
        }
        Insert: {
          active_flag?: boolean | null
          capex_cost?: number | null
          created_at?: string | null
          fleet_category: string
          fleet_id: string
          fleet_name: string
          operator?: string | null
          opex_cost_per_month?: number | null
          service_level?: string | null
          vehicle_type?: string | null
        }
        Update: {
          active_flag?: boolean | null
          capex_cost?: number | null
          created_at?: string | null
          fleet_category?: string
          fleet_id?: string
          fleet_name?: string
          operator?: string | null
          opex_cost_per_month?: number | null
          service_level?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      dim_route: {
        Row: {
          active_flag: boolean | null
          created_at: string | null
          destination_city: string
          destination_station_id: string | null
          distance_km: number | null
          eta_est: number | null
          origin_city: string
          origin_station_id: string | null
          price_card: number | null
          route_id: string
          route_name: string
          route_type: string
        }
        Insert: {
          active_flag?: boolean | null
          created_at?: string | null
          destination_city: string
          destination_station_id?: string | null
          distance_km?: number | null
          eta_est?: number | null
          origin_city: string
          origin_station_id?: string | null
          price_card?: number | null
          route_id: string
          route_name: string
          route_type: string
        }
        Update: {
          active_flag?: boolean | null
          created_at?: string | null
          destination_city?: string
          destination_station_id?: string | null
          distance_km?: number | null
          eta_est?: number | null
          origin_city?: string
          origin_station_id?: string | null
          price_card?: number | null
          route_id?: string
          route_name?: string
          route_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "dim_route_destination_station_id_fkey"
            columns: ["destination_station_id"]
            isOneToOne: false
            referencedRelation: "dim_station"
            referencedColumns: ["station_id"]
          },
          {
            foreignKeyName: "dim_route_origin_station_id_fkey"
            columns: ["origin_station_id"]
            isOneToOne: false
            referencedRelation: "dim_station"
            referencedColumns: ["station_id"]
          },
        ]
      }
      dim_station: {
        Row: {
          active_flag: boolean | null
          city: string
          created_at: string | null
          latitude: number | null
          longitude: number | null
          province: string
          station_id: string
          station_name: string
          station_type: string
        }
        Insert: {
          active_flag?: boolean | null
          city: string
          created_at?: string | null
          latitude?: number | null
          longitude?: number | null
          province: string
          station_id: string
          station_name: string
          station_type: string
        }
        Update: {
          active_flag?: boolean | null
          city?: string
          created_at?: string | null
          latitude?: number | null
          longitude?: number | null
          province?: string
          station_id?: string
          station_name?: string
          station_type?: string
        }
        Relationships: []
      }
      dim_time: {
        Row: {
          date: string
          day: number
          day_name: string
          day_of_week: number
          is_holiday: boolean | null
          is_peak_season: boolean | null
          is_weekend: boolean | null
          month: number
          month_name: string
          quarter: number
          time_id: number
          week_of_year: number
          year: number
        }
        Insert: {
          date: string
          day: number
          day_name: string
          day_of_week: number
          is_holiday?: boolean | null
          is_peak_season?: boolean | null
          is_weekend?: boolean | null
          month: number
          month_name: string
          quarter: number
          time_id: number
          week_of_year: number
          year: number
        }
        Update: {
          date?: string
          day?: number
          day_name?: string
          day_of_week?: number
          is_holiday?: boolean | null
          is_peak_season?: boolean | null
          is_weekend?: boolean | null
          month?: number
          month_name?: string
          quarter?: number
          time_id?: number
          week_of_year?: number
          year?: number
        }
        Relationships: []
      }
      dim_vehicle: {
        Row: {
          active_flag: boolean | null
          created_at: string | null
          fleet_id: string | null
          in_service_date: string | null
          retired_date: string | null
          seat_capacity: number | null
          vehicle_class: string | null
          vehicle_code: string | null
          vehicle_id: string
          vehicle_model: string | null
          vehicle_type: string
        }
        Insert: {
          active_flag?: boolean | null
          created_at?: string | null
          fleet_id?: string | null
          in_service_date?: string | null
          retired_date?: string | null
          seat_capacity?: number | null
          vehicle_class?: string | null
          vehicle_code?: string | null
          vehicle_id: string
          vehicle_model?: string | null
          vehicle_type: string
        }
        Update: {
          active_flag?: boolean | null
          created_at?: string | null
          fleet_id?: string | null
          in_service_date?: string | null
          retired_date?: string | null
          seat_capacity?: number | null
          vehicle_class?: string | null
          vehicle_code?: string | null
          vehicle_id?: string
          vehicle_model?: string | null
          vehicle_type?: string
        }
        Relationships: []
      }
      fact_driver_log: {
        Row: {
          arrival_datetime_act: string | null
          arrival_datetime_est: string | null
          base_station_id: string | null
          created_at: string | null
          depart_datetime_act: string | null
          depart_datetime_est: string | null
          destination_city: string | null
          driver_id: string | null
          driver_name: string | null
          employment_type: string | null
          eta_est: number | null
          id: string
          origin_city: string | null
          scheduled_trip_id: string | null
          trip_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          arrival_datetime_act?: string | null
          arrival_datetime_est?: string | null
          base_station_id?: string | null
          created_at?: string | null
          depart_datetime_act?: string | null
          depart_datetime_est?: string | null
          destination_city?: string | null
          driver_id?: string | null
          driver_name?: string | null
          employment_type?: string | null
          eta_est?: number | null
          id?: string
          origin_city?: string | null
          scheduled_trip_id?: string | null
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          arrival_datetime_act?: string | null
          arrival_datetime_est?: string | null
          base_station_id?: string | null
          created_at?: string | null
          depart_datetime_act?: string | null
          depart_datetime_est?: string | null
          destination_city?: string | null
          driver_id?: string | null
          driver_name?: string | null
          employment_type?: string | null
          eta_est?: number | null
          id?: string
          origin_city?: string | null
          scheduled_trip_id?: string | null
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fact_driver_log_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "dim_driver"
            referencedColumns: ["driver_id"]
          },
        ]
      }
      fact_funnel: {
        Row: {
          booking_page_flag: boolean | null
          channel_id: string
          created_at: string | null
          customer_id: string | null
          homepage_flag: boolean | null
          order_id: string | null
          seat_option_page_flag: boolean | null
          session_id: string
          trip_input_page_flag: boolean | null
          trip_option_page_flag: boolean | null
        }
        Insert: {
          booking_page_flag?: boolean | null
          channel_id: string
          created_at?: string | null
          customer_id?: string | null
          homepage_flag?: boolean | null
          order_id?: string | null
          seat_option_page_flag?: boolean | null
          session_id: string
          trip_input_page_flag?: boolean | null
          trip_option_page_flag?: boolean | null
        }
        Update: {
          booking_page_flag?: boolean | null
          channel_id?: string
          created_at?: string | null
          customer_id?: string | null
          homepage_flag?: boolean | null
          order_id?: string | null
          seat_option_page_flag?: boolean | null
          session_id?: string
          trip_input_page_flag?: boolean | null
          trip_option_page_flag?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fact_funnel_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "dim_customer"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      fact_nps_response: {
        Row: {
          created_at: string | null
          customer_type: string | null
          detractors_count: number | null
          id: string
          month: string
          passives_count: number | null
          promoters_count: number | null
          route_id: string | null
          total_responses: number | null
        }
        Insert: {
          created_at?: string | null
          customer_type?: string | null
          detractors_count?: number | null
          id?: string
          month: string
          passives_count?: number | null
          promoters_count?: number | null
          route_id?: string | null
          total_responses?: number | null
        }
        Update: {
          created_at?: string | null
          customer_type?: string | null
          detractors_count?: number | null
          id?: string
          month?: string
          passives_count?: number | null
          promoters_count?: number | null
          route_id?: string | null
          total_responses?: number | null
        }
        Relationships: []
      }
      fact_nps_response_raw: {
        Row: {
          created_at: string | null
          customer_type: string | null
          month: string
          nps_response_id: string
          nps_score: number | null
          route_id: string | null
          survey_channel: string | null
        }
        Insert: {
          created_at?: string | null
          customer_type?: string | null
          month: string
          nps_response_id: string
          nps_score?: number | null
          route_id?: string | null
          survey_channel?: string | null
        }
        Update: {
          created_at?: string | null
          customer_type?: string | null
          month?: string
          nps_response_id?: string
          nps_score?: number | null
          route_id?: string | null
          survey_channel?: string | null
        }
        Relationships: []
      }
      fact_revenue: {
        Row: {
          arrival_datetime_act: string | null
          arrival_datetime_est: string | null
          booking_datetime: string | null
          created_at: string | null
          customer_id: string | null
          depart_datetime_act: string | null
          depart_datetime_est: string | null
          destination_city: string | null
          driver_id: string | null
          eta_est: number | null
          gross_value_amount: number | null
          order_id: string
          origin_city: string | null
          outlet_id: string | null
          payment_status: string | null
          round_trip_status: boolean | null
          route_id: string | null
          seat_count: number | null
          service_type_id: string | null
          ticket_status: string | null
          trip_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          arrival_datetime_act?: string | null
          arrival_datetime_est?: string | null
          booking_datetime?: string | null
          created_at?: string | null
          customer_id?: string | null
          depart_datetime_act?: string | null
          depart_datetime_est?: string | null
          destination_city?: string | null
          driver_id?: string | null
          eta_est?: number | null
          gross_value_amount?: number | null
          order_id: string
          origin_city?: string | null
          outlet_id?: string | null
          payment_status?: string | null
          round_trip_status?: boolean | null
          route_id?: string | null
          seat_count?: number | null
          service_type_id?: string | null
          ticket_status?: string | null
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          arrival_datetime_act?: string | null
          arrival_datetime_est?: string | null
          booking_datetime?: string | null
          created_at?: string | null
          customer_id?: string | null
          depart_datetime_act?: string | null
          depart_datetime_est?: string | null
          destination_city?: string | null
          driver_id?: string | null
          eta_est?: number | null
          gross_value_amount?: number | null
          order_id?: string
          origin_city?: string | null
          outlet_id?: string | null
          payment_status?: string | null
          round_trip_status?: boolean | null
          route_id?: string | null
          seat_count?: number | null
          service_type_id?: string | null
          ticket_status?: string | null
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fact_revenue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "dim_customer"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "fact_revenue_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "dim_driver"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fact_revenue_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "dim_route"
            referencedColumns: ["route_id"]
          },
        ]
      }
      fact_ticket_sales: {
        Row: {
          created_at: string | null
          customer_id: string | null
          fare_amount: number | null
          purchase_date: string | null
          seat_number: number | null
          ticket_id: string
          ticket_status: string | null
          trip_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          fare_amount?: number | null
          purchase_date?: string | null
          seat_number?: number | null
          ticket_id: string
          ticket_status?: string | null
          trip_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          fare_amount?: number | null
          purchase_date?: string | null
          seat_number?: number | null
          ticket_id?: string
          ticket_status?: string | null
          trip_id?: string | null
        }
        Relationships: []
      }
      fact_trip: {
        Row: {
          actual_arrival_time: string | null
          actual_departure_time: string | null
          created_at: string | null
          delay_minutes: number | null
          driver_id: string | null
          is_on_time: boolean | null
          route_id: string | null
          scheduled_arrival_time: string | null
          scheduled_departure_time: string | null
          trip_date: string | null
          trip_id: string
          trip_status: string | null
          vehicle_id: string | null
        }
        Insert: {
          actual_arrival_time?: string | null
          actual_departure_time?: string | null
          created_at?: string | null
          delay_minutes?: number | null
          driver_id?: string | null
          is_on_time?: boolean | null
          route_id?: string | null
          scheduled_arrival_time?: string | null
          scheduled_departure_time?: string | null
          trip_date?: string | null
          trip_id: string
          trip_status?: string | null
          vehicle_id?: string | null
        }
        Update: {
          actual_arrival_time?: string | null
          actual_departure_time?: string | null
          created_at?: string | null
          delay_minutes?: number | null
          driver_id?: string | null
          is_on_time?: boolean | null
          route_id?: string | null
          scheduled_arrival_time?: string | null
          scheduled_departure_time?: string | null
          trip_date?: string | null
          trip_id?: string
          trip_status?: string | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      fact_vehicle_revenue: {
        Row: {
          ancillary_revenue: number | null
          created_at: string | null
          fleet_id: string | null
          operating_cost: number | null
          revenue_date: string | null
          revenue_id: string
          ticket_revenue: number | null
          total_revenue: number | null
          vehicle_id: string | null
        }
        Insert: {
          ancillary_revenue?: number | null
          created_at?: string | null
          fleet_id?: string | null
          operating_cost?: number | null
          revenue_date?: string | null
          revenue_id: string
          ticket_revenue?: number | null
          total_revenue?: number | null
          vehicle_id?: string | null
        }
        Update: {
          ancillary_revenue?: number | null
          created_at?: string | null
          fleet_id?: string | null
          operating_cost?: number | null
          revenue_date?: string | null
          revenue_id?: string
          ticket_revenue?: number | null
          total_revenue?: number | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      metadata_business_dictionary: {
        Row: {
          agent_guidance: string | null
          business_definition: string | null
          category: string | null
          created_at: string | null
          full_name: string | null
          id: string
          term: string
        }
        Insert: {
          agent_guidance?: string | null
          business_definition?: string | null
          category?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          term: string
        }
        Update: {
          agent_guidance?: string | null
          business_definition?: string | null
          category?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          term?: string
        }
        Relationships: []
      }
      metadata_data_dictionary: {
        Row: {
          agent_usage_note: string | null
          business_definition: string | null
          column_name: string
          created_at: string | null
          data_type: string | null
          id: string
          is_primary_key: boolean | null
          table_name: string
        }
        Insert: {
          agent_usage_note?: string | null
          business_definition?: string | null
          column_name: string
          created_at?: string | null
          data_type?: string | null
          id?: string
          is_primary_key?: boolean | null
          table_name: string
        }
        Update: {
          agent_usage_note?: string | null
          business_definition?: string | null
          column_name?: string
          created_at?: string | null
          data_type?: string | null
          id?: string
          is_primary_key?: boolean | null
          table_name?: string
        }
        Relationships: []
      }
      saved_insights: {
        Row: {
          id: string
          conversation_id: string
          type: string
          title: string
          description: string | null
          source_message_id: string
          chart_config: Json | null
          auto_detected: boolean
          created_at: string
        }
        Insert: {
          id: string
          conversation_id: string
          type: string
          title: string
          description?: string | null
          source_message_id: string
          chart_config?: Json | null
          auto_detected?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          type?: string
          title?: string
          description?: string | null
          source_message_id?: string
          chart_config?: Json | null
          auto_detected?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_insights_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          id: string
          title: string
          conversation_id: string
          included_insight_ids: string[]
          insights_snapshot: Json
          format: string
          status: string
          gaps: Json
          content: Json | null
          generation_status: string
          generation_error: string | null
          created_at: string
        }
        Insert: {
          id: string
          title: string
          conversation_id: string
          included_insight_ids?: string[]
          insights_snapshot?: Json
          format: string
          status?: string
          gaps?: Json
          content?: Json | null
          generation_status?: string
          generation_error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          conversation_id?: string
          included_insight_ids?: string[]
          insights_snapshot?: Json
          format?: string
          status?: string
          gaps?: Json
          content?: Json | null
          generation_status?: string
          generation_error?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_executions: {
        Row: {
          agent_id: string | null
          completed_at: string | null
          confidence_scores: Json | null
          error_message: string | null
          id: string
          input_data: Json
          output_content: string | null
          skill_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          agent_id?: string | null
          completed_at?: string | null
          confidence_scores?: Json | null
          error_message?: string | null
          id?: string
          input_data: Json
          output_content?: string | null
          skill_id?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          agent_id?: string | null
          completed_at?: string | null
          confidence_scores?: Json | null
          error_message?: string | null
          id?: string
          input_data?: Json
          output_content?: string | null
          skill_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_executions_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "agent_skills"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
