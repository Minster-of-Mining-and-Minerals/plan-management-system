import { baseApi } from "../baseApi";
import type {
  PatientSlipConfig,
  PatientSlipConfigResponse,
} from "../types/patientSlipConfig";

export const patientSlipApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPatientSlipConfig: builder.query<PatientSlipConfigResponse, void>({
      query: () => "/patients/slip-configuration",
      transformResponse: (response: { data: PatientSlipConfigResponse }) =>
        response.data,
      providesTags: ["PatientSlipConfig"],
    }),

    updatePatientSlipConfig: builder.mutation<
      { slip_config: PatientSlipConfig },
      PatientSlipConfig
    >({
      query: (slip_config) => ({
        url: "/patients/slip-configuration",
        method: "PUT",
        body: { slip_config },
      }),
      transformResponse: (response: {
        data: { slip_config: PatientSlipConfig };
      }) => response.data,
      invalidatesTags: ["PatientSlipConfig"],
    }),
  }),
});

export const {
  useGetPatientSlipConfigQuery,
  useUpdatePatientSlipConfigMutation,
} = patientSlipApi;
