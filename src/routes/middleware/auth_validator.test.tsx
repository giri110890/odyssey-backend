const supertest = require('supertest');
const app = require('../../../app');
const request = supertest(app);
const assert = require('assert');
const auth_validator = require('./auth_validator');
const jwt2 = require('jose');
const app_config = require('../../../config/config');
const permissions = require('../middleware/permission/permissions');
const perm = require('../middleware/permission/permission_validator');


const id_token_old_public_key='eyJraWQiOiJoK2VzNlNVNUVzQmhuTFJjdnpnckxFbk80UlRsQVQ2NWxuNFczQ2JpemhJPSIsImFsZyI6IlJTMjU2In0.eyJhdF9oYXNoIjoiM1Exb1BoTXpnWDNWOGNrM1JFZTVvUSIsInN1YiI6ImQ0NTgzNDE4LTMwYjEtNzA0Yi0yMzM4LTQ2YmYyODhkOTc3MiIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9UWTdIczRxUGUiLCJwaG9uZV9udW1iZXJfdmVyaWZpZWQiOmZhbHNlLCJjb2duaXRvOnVzZXJuYW1lIjoiZDQ1ODM0MTgtMzBiMS03MDRiLTIzMzgtNDZiZjI4OGQ5NzcyIiwiYXVkIjoiMmRvcmR1OGpnbTg3NDUwaTRvcm51azRxaDMiLCJldmVudF9pZCI6IjAxNTRjMTE3LTEyNDktNGZlMi1hYWRlLWE5MjE5ZWE5NWFlYiIsInRva2VuX3VzZSI6ImlkIiwiYXV0aF90aW1lIjoxNzAxOTA2NzE3LCJwaG9uZV9udW1iZXIiOiIrMTYxMzg2MjgyOTgiLCJleHAiOjE3MDE5MTAzMTcsImlhdCI6MTcwMTkwNjcxNywianRpIjoiYTI3NGVkNzAtODI4YS00NmE3LTgyMDQtZGFiZjIzNTBlMTZhIiwiZW1haWwiOiJzdGVwaGVuX3doZWVsZXJAeWFob28uY29tIn0.d3hr7gfvl8i0LBCCV5-Il9xNwXTtbkhaNpUjKPJX4s9DQqDN-egBj8N1lKjKcR9xgl8uQGVowWs3iEEzYfp5XfFpuYQa-lUyYoA1CKdB227dyfvzhsmDxOnx8INf4uaaCrMGrOdEGkccduHIK2lb8wkkHOJWNc_A_SZAf8wIPYVdHi_b4qYkijxVYuAjnpoxsh7YJBrEVX6j-SYDH8s8dCQGjgd6fV5sOzO_t3AyRUR8N4UPh2-rtshFS1FHND0LvLA5L8vznqEdWt6dWmLU2Q3AG7W5WlQ31eG-tSfKjepgm0Pl7GOgYsLgMFC7X0vBrdLMBSZ4p-UGK7-pMbHhBg';
const access_token_old_public_key='eyJraWQiOiJWaW9GSjQ3SzVpZEg4dXF3cVFIMVhTZWNvVmluZDNEZzZCVGlUeWY0RWpBPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJkNDU4MzQxOC0zMGIxLTcwNGItMjMzOC00NmJmMjg4ZDk3NzIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9UWTdIczRxUGUiLCJ2ZXJzaW9uIjoyLCJjbGllbnRfaWQiOiIyZG9yZHU4amdtODc0NTBpNG9ybnVrNHFoMyIsImV2ZW50X2lkIjoiMDE1NGMxMTctMTI0OS00ZmUyLWFhZGUtYTkyMTllYTk1YWViIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJwaG9uZSBvcGVuaWQgZW1haWwiLCJhdXRoX3RpbWUiOjE3MDE5MDY3MTcsImV4cCI6MTcwMTkxMDMxNywiaWF0IjoxNzAxOTA2NzE3LCJqdGkiOiIzNzkwNGExMy02NTc2LTQyYTAtODNkNS03YmM5OWU1NjM4ODQiLCJ1c2VybmFtZSI6ImQ0NTgzNDE4LTMwYjEtNzA0Yi0yMzM4LTQ2YmYyODhkOTc3MiJ9.H7btwN5kHG1n-dbKuraeghnEmSAa-vXIaL6zlwsdLIFq18SFbeFE-TG2ciXv_lxDsDEddWBo4wgVKCO3KbTJTQYX6PVgDhTgrp4rPLfhaWc6HJX8IgwndpFhvjz2R6C6ImU6HpmwCIE93qQXJo3vLfQikypop8PBef2y8PMx8RGivXanGK_FEsAMHL1hkGy5S0aLfuFm37YZ7bY1QKvoGv3c9zcivyoN8xGCOTI4n8q3QjCQSq6uaOEkdqIEyzuxU5Vw6AtM939x807N7pAhupZmgqj0HKTjwkezw-qgqGMfhI8ZsxubOuscqDsyojkNFnmXnr167AgiekCUuiW1cQ';

const id_token_expired='eyJraWQiOiJMaldHWTMzTmtSYmRwXC9YZDkrak9nODlZQWJDeDBDd3Z4N1Rja211Z1BUUT0iLCJhbGciOiJSUzI1NiJ9.eyJhdF9oYXNoIjoiXzAyQlZMTUp6YlJNWUVKZXJjOURDQSIsInN1YiI6ImY3ZWNjNzhjLTVlZjMtNGMxOC1iMTY3LWQ5ZDJmZTYwOTQxNyIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9sM0ZqMXNabmUiLCJjb2duaXRvOnVzZXJuYW1lIjoiZjdlY2M3OGMtNWVmMy00YzE4LWIxNjctZDlkMmZlNjA5NDE3IiwiYXVkIjoiNnA2MWYwbnQ2OTZhbjNvcm5wN2o2aXQ3b2YiLCJldmVudF9pZCI6IjE4MDAyZjczLTE0ZDUtNGQ4Zi05ZGY5LWIzYzM1ZGVjMWFjZCIsInRva2VuX3VzZSI6ImlkIiwiYXV0aF90aW1lIjoxNzA2NjUxNzM0LCJleHAiOjE3MDY2NTUzMzQsImlhdCI6MTcwNjY1MTczNCwianRpIjoiODVhMjRiY2UtNDViYi00ODU1LWI2MDYtZjFmNzAxNzVhMDQ2IiwiZW1haWwiOiJzdGVwaGVuX3doZWVsZXJAeWFob28uY29tIn0.lT1G-RdiE3W1LE7rCQBKR8tLbMRP4HKc1CoiI9E__7OwYfzcxzXQrP1rr9wUxf1NmPP63g1MC__j4pMWYzcbHjadRcY_RIz3-P_CgG9B354ejJR4s_ZtZtKZMT9Oa0v8KjL0JzcPtOyXv8wAh3hIqbJlaeJxy-I2h1RFJ4MDIXeGuK_imsVgxUSNlcH7Kp8cL8JrEk0z7GAN5w_PpRqqz4n6LBQTkv7Fp5aMLTPOLYG9TmTG5JCe8fa3uaCOj_DyhMhxXgybfCh-4fQ40NvFxDWW31aI8moO8UUAUMMz34cZ_so4Tv3p6Ptrzqre8L0VdUr04vij5KO5xphwFnQyyQ'; 
const access_token_expired='eyJraWQiOiJpRHJhXC9XeVVsMnJmU0RtTGpDcVZDbWhtcVliTnFqZlZpYlwvdHZENEZPaUE9IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiJmN2VjYzc4Yy01ZWYzLTRjMTgtYjE2Ny1kOWQyZmU2MDk0MTciLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9sM0ZqMXNabmUiLCJ2ZXJzaW9uIjoyLCJjbGllbnRfaWQiOiI2cDYxZjBudDY5NmFuM29ybnA3ajZpdDdvZiIsImV2ZW50X2lkIjoiMTgwMDJmNzMtMTRkNS00ZDhmLTlkZjktYjNjMzVkZWMxYWNkIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJwaG9uZSBvcGVuaWQgZW1haWwiLCJhdXRoX3RpbWUiOjE3MDY2NTE3MzQsImV4cCI6MTcwNjY1NTMzNCwiaWF0IjoxNzA2NjUxNzM0LCJqdGkiOiIwMDhjNDVkNS1hYTE2LTQzMDItYjBkZC1iZTliZWY2ZDQyODQiLCJ1c2VybmFtZSI6ImY3ZWNjNzhjLTVlZjMtNGMxOC1iMTY3LWQ5ZDJmZTYwOTQxNyJ9.DWqXqYSZOLh6XxZMUO2x5ThoEdItCnnHBB3i7J6A7ndZUENCOQI41Vh4hBZypJjdj9Lp97Vd2Nuo_qpmqQOtNqP46BjlkECcMAmM7pkhQ6ewTrDhBd94EuZMXFr2h4PqB6RRFCYLTPgv2oTXE19JqR_K8tT61eFNuw7LtlO6WYJa3Epcl6muJfoK9oeFdxQ4enWcLcWcgJ42MFZuCVKjvjQGda6OY3JwMz2UTb5EURaDHktAyIbxTA206XF2kbyaBv1i-8N4rX6bMANfFZf8IIKN8DbV56TJphS1Ly-40WS3OGxBPPs7db7xLhgxks6J01Pp3XZNq8Dtdbw_xalBXA';

// Invalid signature
const id_token_invalid='eyJraWQiOiJMaldHWTMzTmtSYmRwXC9YZDkrak9nODlZQWJDeDBDd3Z4N1Rja211Z1BUUT0iLCJhbGciOiJSUzI1NiJ9.eyJhdF9oYXNoIjoiXzAyQlZMTUp6YlJNWUVKZXJjOURDQSIsInN1YiI6ImY3ZWNjNzhjLTVlZjMtNGMxOC1iMTY3LWQ5ZDJmZTYwOTQxNyIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9sM0ZqMXNabmUiLCJjb2duaXRvOnVzZXJuYW1lIjoiZjdlY2M3OGMtNWVmMy00YzE4LWIxNjctZDlkMmZlNjA5NDE3IiwiYXVkIjoiNnA2MWYwbnQ2OTZhbjNvcm5wN2o2aXQ3b2YiLCJldmVudF9pZCI6IjE4MDAyZjczLTE0ZDUtNGQ4Zi05ZGY5LWIzYzM1ZGVjMWFjZCIsInRva2VuX3VzZSI6ImlkIiwiYXV0aF90aW1lIjoxNzA2NjUxNzM0LCJleHAiOjE3MDY2NTUzMzQsImlhdCI6MTcwNjY1MTczNCwianRpIjoiODVhMjRiY2UtNDViYi00ODU1LWI2MDYtZjFmNzAxNzVhMDQ2IiwiZW1haWwiOiJzdGVwaGVuX3doZWVsZXJAeWFob28uY29tIn0.lT1G-RdiE3W1LE7rCQBKR8tLbMRP4HKc1CoiI9E__7OwYfzcxzXQrP1rr9wUxf1NmPP63g1MC__j4pMWYzcbHjadRcY_RIz3-P_CgG9B354ejJR4s_ZtZtKZMT9Oa0v8KjL0JzcPtOyXv8wAh3hIqbJlaeJxy-I2h1RFJ4MDIXeGuK_imsVgxUSNlcH7Kp8cL8JrEk0z7GAN5w_PpRqqz4n6LBQTkv7Fp5aMLTPOLYG9TmTG5JCe8fa3uaCOj_DyhMhxXgybfCh-4fQ40NvFxDWW31aI8moO8UUAUMMz34cZ_so4Tv3p6Ptrzqre8L0VdUr04vij5KO5xphwFsteve'; 
// Invalid payload
const access_token_invalid='eyJraWQiOiJpRHJhXC9XeVVsMnJmU0RtTGpDcVZDbWhtcVliTnFqZlZpYlwvdHZENEZPaUE9IiwiYWxnIjoiUlMyNTYifQ.steveWIiOiJmN2VjYzc4Yy01ZWYzLTRjMTgtYjE2Ny1kOWQyZmU2MDk0MTciLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9sM0ZqMXNabmUiLCJ2ZXJzaW9uIjoyLCJjbGllbnRfaWQiOiI2cDYxZjBudDY5NmFuM29ybnA3ajZpdDdvZiIsImV2ZW50X2lkIjoiMTgwMDJmNzMtMTRkNS00ZDhmLTlkZjktYjNjMzVkZWMxYWNkIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJwaG9uZSBvcGVuaWQgZW1haWwiLCJhdXRoX3RpbWUiOjE3MDY2NTE3MzQsImV4cCI6MTcwNjY1NTMzNCwiaWF0IjoxNzA2NjUxNzM0LCJqdGkiOiIwMDhjNDVkNS1hYTE2LTQzMDItYjBkZC1iZTliZWY2ZDQyODQiLCJ1c2VybmFtZSI6ImY3ZWNjNzhjLTVlZjMtNGMxOC1iMTY3LWQ5ZDJmZTYwOTQxNyJ9.DWqXqYSZOLh6XxZMUO2x5ThoEdItCnnHBB3i7J6A7ndZUENCOQI41Vh4hBZypJjdj9Lp97Vd2Nuo_qpmqQOtNqP46BjlkECcMAmM7pkhQ6ewTrDhBd94EuZMXFr2h4PqB6RRFCYLTPgv2oTXE19JqR_K8tT61eFNuw7LtlO6WYJa3Epcl6muJfoK9oeFdxQ4enWcLcWcgJ42MFZuCVKjvjQGda6OY3JwMz2UTb5EURaDHktAyIbxTA206XF2kbyaBv1i-8N4rX6bMANfFZf8IIKN8DbV56TJphS1Ly-40WS3OGxBPPs7db7xLhgxks6J01Pp3XZNq8Dtdbw_xalBXA';


// Store public keys for tokens test data - Cognito might change them which would invalidate the tests.
const old_public_keys = {
    "h+es6SU5EsBhnLRcvzgrLEnO4RTlAT65ln4W3CbizhI=": {
        alg:"RS256",
        e:"AQAB",
        n:"v96xCmln_Veu1J4QgEsP_hQZYsDOAQC8eUaYQBK2iGseIXvvZsgjrURRzLUQTTVZzgdBokqZa0LX-ok-CQU0tVTyp8IXoc6DPGbxy81HbFpn4bvirXQAMI8QNcrrcuUh73DI4knyF-iCAMcFQ_7IHm6Dy5Eh7VA80D4c28MIDzHJB2CgJR_7ovlESDo6y_Pf8KicWka0jOFBGd8civajoGC9NvVoQt42m3_mo_d2lt87aReBlnVPeT9PD0p2aXW04aZP0d21dYV3O1kWEoxnR1vUF_D0vXUv3lkSoNalz2M17IlR4BxKIBVtKWTrdKmjZpLnsdJUmQ-3qNOrE3RoPQ",
        pem:"-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv96xCmln/Veu1J4QgEsP\n/hQZYsDOAQC8eUaYQBK2iGseIXvvZsgjrURRzLUQTTVZzgdBokqZa0LX+ok+CQU0\ntVTyp8IXoc6DPGbxy81HbFpn4bvirXQAMI8QNcrrcuUh73DI4knyF+iCAMcFQ/7I\nHm6Dy5Eh7VA80D4c28MIDzHJB2CgJR/7ovlESDo6y/Pf8KicWka0jOFBGd8civaj\noGC9NvVoQt42m3/mo/d2lt87aReBlnVPeT9PD0p2aXW04aZP0d21dYV3O1kWEoxn\nR1vUF/D0vXUv3lkSoNalz2M17IlR4BxKIBVtKWTrdKmjZpLnsdJUmQ+3qNOrE3Ro\nPQIDAQAB\n-----END PUBLIC KEY-----\n",
    },
    "VioFJ47K5idH8uqwqQH1XSecoVind3Dg6BTiTyf4EjA=": {
        alg:"RS256",
        e:"AQAB",
        n:"mtNh1ksbHRGw5nXObJOnZRnhfyqtsaSD270RdNYvGQN8sju_SYo176ne1T14pDqNzaXAMKBOSQD1QMgN5MqvFbOckJFzxAc9b9P2xUAzWGTN0YwHSQK05x2QG98MaFbCrwECmNuUan0eZTZMxcjdsAe8dlDb-ikCZvtX000qAGuWQnNJaF-yFwwmPmwcZqGI6N-jhB6XRYwYe9-Ls0ojpaxXtW8Q4y_QA44lOvQSzbMcuYvVyN3F9VIEw2pLSCzsmMkT1pIkh-OAH9sHrP2o6fiAp7MSEjmfvy9_ohEG4dCmmjSWr38UzcCUgmZVVagZsCRN-KA6xEPDOkO3jAtv7Q",
        pem:"-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmtNh1ksbHRGw5nXObJOn\nZRnhfyqtsaSD270RdNYvGQN8sju/SYo176ne1T14pDqNzaXAMKBOSQD1QMgN5Mqv\nFbOckJFzxAc9b9P2xUAzWGTN0YwHSQK05x2QG98MaFbCrwECmNuUan0eZTZMxcjd\nsAe8dlDb+ikCZvtX000qAGuWQnNJaF+yFwwmPmwcZqGI6N+jhB6XRYwYe9+Ls0oj\npaxXtW8Q4y/QA44lOvQSzbMcuYvVyN3F9VIEw2pLSCzsmMkT1pIkh+OAH9sHrP2o\n6fiAp7MSEjmfvy9/ohEG4dCmmjSWr38UzcCUgmZVVagZsCRN+KA6xEPDOkO3jAtv\n7QIDAQAB\n-----END PUBLIC KEY-----\n"
    }
}

const public_keys = {
    "iDra/WyUl2rfSDmLjCqVCmhmqYbNqjfVib/tvD4FOiA=": {
        alg:'RS256',
        e:'AQAB',
        n:'2IHIa5ClI_k8PZXmo421ALyI_99Mb01TWCJ5TLkzQrZLOFSa7ya5MbZnsObnmIr4GhkMKBDGbsSRH6ccw2ouXawgsNQoGUqgnYLIqnu4yR7sr_6k29bCBNwQfluL5dmWXB-_2-vnGJ20uwUiWY3wKPgAmmyW0N6vMIR0H64js5jIRCJPtgDxCMgSDUmzGdCA2ublZa5cxZBz3KbnoIIWs_HAbEPaCct4QXOX2unSK4Fmyk-u3V8w1zbxCjRboJAdZaNDpc3crcrpPy3ljhFLLa3xYg7qetuJ0zZg0T_RnYI7gRPJyoHtKF-h_Dq8LWVmH38zwRh1xuaXtQ4yPt4y4Q',
        pem:'-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2IHIa5ClI/k8PZXmo421\nALyI/99Mb01TWCJ5TLkzQrZLOFSa7ya5MbZnsObnmIr4GhkMKBDGbsSRH6ccw2ou\nXawgsNQoGUqgnYLIqnu4yR7sr/6k29bCBNwQfluL5dmWXB+/2+vnGJ20uwUiWY3w\nKPgAmmyW0N6vMIR0H64js5jIRCJPtgDxCMgSDUmzGdCA2ublZa5cxZBz3KbnoIIW\ns/HAbEPaCct4QXOX2unSK4Fmyk+u3V8w1zbxCjRboJAdZaNDpc3crcrpPy3ljhFL\nLa3xYg7qetuJ0zZg0T/RnYI7gRPJyoHtKF+h/Dq8LWVmH38zwRh1xuaXtQ4yPt4y\n4QIDAQAB\n-----END PUBLIC KEY-----\n'
    },
    "LjWGY33NkRbdp/Xd9+jOg89YAbCx0Cwvx7TckmugPTQ=": {
        alg: 'RS256', 
        e: 'AQAB', 
        n: 'u9Br9X_kP4mTF7WSvGVbTj3Bd5TALQefRnkwzURw1V0ax6vL3B7JTxKANHlP2nEPtj51NiC9KAUDXz0lnQRViudSXClnmyN_MP-dYTEHJT0uLn5iAQUtDaTD-VG8Ud__77JTPuHC53o4sgfSaP4fLDvdStH1N4zNt8jCuIMsUmcLJtcdgBlUXTdUoORHf91IfqDIm9_lfwQZ-H_ZQmBXPNg3F_rRqLHgJ__DXnGHx0CXYcoSRPvcavfjXcPdgbEJmiOcm_uicSuSJTIqjIDPE7DS53gv7XKWxRkWtSTyaLkktjVABQBM33_Na-8FahXbqehn1mbFkEBmbEX1pJRU0w',
        pem: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu9Br9X/kP4mTF7WSvGVb\nTj3Bd5TALQefRnkwzURw1V0ax6vL3B7JTxKANHlP2nEPtj51NiC9KAUDXz0lnQRV\niudSXClnmyN/MP+dYTEHJT0uLn5iAQUtDaTD+VG8Ud//77JTPuHC53o4sgfSaP4f\nLDvdStH1N4zNt8jCuIMsUmcLJtcdgBlUXTdUoORHf91IfqDIm9/lfwQZ+H/ZQmBX\nPNg3F/rRqLHgJ//DXnGHx0CXYcoSRPvcavfjXcPdgbEJmiOcm/uicSuSJTIqjIDP\nE7DS53gv7XKWxRkWtSTyaLkktjVABQBM33/Na+8FahXbqehn1mbFkEBmbEX1pJRU\n0wIDAQAB\n-----END PUBLIC KEY-----\n'
    }
}

// Tokens for authenticated calls.
var live_id_token = '';
var live_access_token = '';
var live_permissions_token = '';

describe('Authentication token handling', () => {

    beforeAll( async () => {
        
        // Login to test account to get live tokens
        const username = app_config.aws.cognito.testuser_username;
        const password = app_config.aws.cognito.testuser_password;
        const authenticationResult = await auth_validator.getLiveAuthTokens(live_access_token, live_id_token, username, password);
        live_id_token = authenticationResult.id_token;
        live_access_token = authenticationResult.access_token;

        // get a permissions token
        live_permissions_token = await perm.buildPermissionsToken({ user_id: 'c458f4a8-c0f1-7051-261d-09cb8b007f51', access: [permissions.AccessRoles.PropertyManager]});

    });

    it('get Cognito JSON Web public keys', async () => {
        const cognito_keys = await auth_validator.getPublicKeys();
        const first_key = JSON.stringify(cognito_keys).split(':');
        assert (! (first_key[0] === null) );
    });

    it('Parse valid token that uses current public key', async () => {
        const cognito_keys = public_keys;
        let parsed_token = null;
        try {
            parsed_token = await auth_validator.parseToken(live_id_token, cognito_keys);
        } catch (error) {
            assert(false);
            return;
        }
        assert(true);
    });

    it('Parse valid token that uses older public key', async () => {
        const cognito_keys = old_public_keys;
        try {
            const parsed_token = await auth_validator.parseToken(id_token_expired, cognito_keys);
        } catch (error) {
            assert(error instanceof auth_validator.PublicKeyError);
            return;
        }
        assert(false);
    });

    it('Parse valid but expired id_token', async () => {
        // const cognito_keys = await auth_validator.getPublicKeys();
        const cognito_keys = public_keys;
        try {
            const parsed_token = await auth_validator.parseToken(id_token_expired, cognito_keys);
        } catch (error: any) {
            assert(error.code == 'ERR_JWT_EXPIRED');
            return;
        }
        assert(false);
    });

    it('Parse valid but expired access_token', async () => {
        // const cognito_keys = await auth_validator.getPublicKeys();
        const cognito_keys = public_keys;
        try {
            const parsed_token = await auth_validator.parseToken(access_token_expired, cognito_keys);
        } catch (error: any) {
            assert(error.code == 'ERR_JWT_EXPIRED');
            return;
        }
        assert(false);
    });


    it('Parse token with invalid signature', async () => {
        // const cognito_keys = await auth_validator.getPublicKeys();
        const cognito_keys = public_keys;
        try {
            const parsed_token = await auth_validator.parseToken(id_token_invalid, cognito_keys);
        } catch (error: any) {
            assert( error.code == 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' );

            return;
        }
        assert(false);
    });

    it('Parse token with invalid payload', async () => {
        const cognito_keys = public_keys;
        try {
            const parsed_token = await auth_validator.parseToken(access_token_invalid, cognito_keys);
        } catch (error: any) {
            assert( error.code == 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' );
            return;
        }
        assert(false);
    });

    it('ensure invalid token gets a 401 error',  (done) => {
        var property_manager_id = 'c458f4a8-c0f1-7051-261d-09cb8b007f51';
        request.get('/all_tenants/' + property_manager_id)
            .set('Cookie', 'id_token=' + id_token_expired + ";access_token=" + access_token_expired)
            .set( { permissions: live_permissions_token } )   // Add permissions token
            .expect(401)
            .end((err: any, res: any) => {
                if (err) return done(err);
                done();
            });
    });

    it('ensure a valid token in Authorization header gets a 200 response', async () => {
        const property_id = 'ab04d63f-535f-4dfc-bc12-fc260cbf7ac4';
        const res = await request.get('/property/' + property_id)
            .set({ Authorization: live_id_token })
            .set( { permissions: live_permissions_token } )   // Add permissions token
            .expect(200)

        expect(res.body[0]).toHaveProperty('id', property_id);    
        
    });

    it('ensure a valid token as a cookie gets a 200 response', async () => {
        const property_id = 'ab04d63f-535f-4dfc-bc12-fc260cbf7ac4';
        const res = await request.get('/property/' + property_id)
            .set('Cookie', 'id_token=' + live_id_token + ";access_token=" + live_access_token)   
            .set( { permissions: live_permissions_token } )   // Add permissions token 
            .expect(200)

        expect(res.body[0]).toHaveProperty('id', property_id);            
    });
});



