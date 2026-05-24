import fs from 'fs'

const file = process.argv[2]
const maxStep = Number(process.argv[3])
let s = fs.readFileSync(file, 'utf8')

for (let n = 2; n <= maxStep; n++) {
  s = s.replaceAll(`          {step === ${n} ? (`, `          <FormPaymentGateWizardStep gate={paymentGate} step={step} targetStep={${n}>`)
}

s = s.replaceAll(
  `            </FormSection>
          ) : null}

          <FormPaymentGateWizardStep`,
  `            </FormSection>
          </FormPaymentGateWizardStep`
)

s = s.replace(
  `            </FormSection>
          ) : null}

          <FormPaymentGateWizardStep gate={paymentGate} step={step} targetStep={1}>`,
  `            </FormSection>
          </FormPaymentGateWizardStep>

          <FormPaymentGateWizardStep gate={paymentGate} step={step} targetStep={1}>`
)

// step 1 close if still broken
s = s.replace(
  `          </FormPaymentGateWizardStep>

          <FormPaymentGateWizardStep gate={paymentGate} step={step} targetStep={2}>`,
  `          </FormPaymentGateWizardStep>

          <FormPaymentGateWizardStep gate={paymentGate} step={step} targetStep={2}>`
)

s = s.replace(
  `          ) : null}

          <div className="nwrma-form-nav">`,
  `          </FormPaymentGateWizardStep>

          {paymentGate.showFormNav ? (
          <div className="nwrma-form-nav">`
)

s = s.replace(`{step > 0 ? (`, `{step > 0 && paymentGate.canAccessWizardSteps ? (`)

s = s.replace(
  `          </div>
        </div>
      </div>

      <ApplicantDetailsDialog
        open={applicantGateOpen}`,
  `          </div>
          ) : null}
        </div>
      </div>

      <ApplicantDetailsDialog
        open={paymentGate.applicantGateOpen}`
)

s = s.replace(`onOpenChange={setApplicantGateOpen}`, `onOpenChange={paymentGate.setApplicantGateOpen}`)
s = s.replace(`initialValues={applicantGateInitialValues(form)}`, `initialValues={paymentGate.applicantGateInitialValues}`)
s = s.replace(
  `onSubmit={handleApplicantGateSubmit}`,
  `onSubmit={paymentGate.submitIntake}
        submitting={paymentGate.submittingIntake}`
)

fs.writeFileSync(file, s)
