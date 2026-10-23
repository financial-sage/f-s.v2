# Savings (Ahorros)

## Propósito

Ahorros permite a la familia **apartar dinero a propósito** cada mes, separado de los bolsillos de gasto y de las cuentas donde vive la liquidez.

No sustituye a [Goals](../goals/README.md): Goals son metas con importe/fecha/salud. Ahorros es el **hábito mensual** de reservar dinero; más adelante puede alimentar Goals.

---

# Relación con otras capas

| Concepto | Rol |
|----------|-----|
| **Cuenta** | Dónde vive el dinero ([Accounts](../accounts/README.md), [ADR-0006](../../../decisions/ADR-0006-accounts-vs-funds.md)) |
| **Bolsillo** | Organización del **gasto** del mes ([Funds](../funds/README.md)) |
| **Ahorro** | Dinero **apartado**, no destinado a gastar este mes |
| **Goals** | Objetivos a largo plazo (fase posterior) |

Flujo canónico de pareja:

```
Ingreso → cuenta → (reparto a bolsillos de gasto) + aporte al bote de ahorro
```

---

# Decisiones de producto (MVP)

| Tema | Decisión |
|------|----------|
| Cardinalidad | **Un** bote de ahorro familiar compartido |
| Origen de aportes | Cuenta visible/operable o bolsillo (no gastos fijos) |
| Retiros | Permitidos hacia cuenta o bolsillo (confirmación UX) |
| Gastos cotidianos | **No** se imputan al bote en el MVP |
| Meta / fecha / salud | Fuera de alcance (Goals) |
| Comparación | Aporte del mes vs aporte del mes anterior (€ y %) |
| Inversiones (ADR-0010) | Solo en Centro de cuentas → tab **Inversiones** (no en Ahorros) |

---

# Ritual de usuario

1. Empieza el mes / llega la nómina → ingreso a **cuentas**.
2. Reparto a **bolsillos** lo previsto para gastar.
3. **Aportar al ahorro** (importe + origen).
4. En `/savings`: saldo acumulado, aporte del mes, diferencia vs mes anterior.

---

# Criterio de éxito

Una pareja aporta al ahorro en menos de un minuto y ve si este mes apartó más, menos o igual que el anterior — sin configurar metas.

---

# Documentos

- [business-rules.md](./business-rules.md)
- [technical-spec.md](./technical-spec.md)
- [ADR-0007](../../../decisions/ADR-0007-savings-vs-funds-accounts.md)
